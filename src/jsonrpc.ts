import { Transport, JSONRPCMessage } from './transport.js';

export class JSONRPCServer {
  private transport: Transport;
  private handlers: Record<string, (params: any) => Promise<any>> = {};

  constructor(transport: Transport) {
    this.transport = transport;
    this.transport.onmessage = this.handleMessage.bind(this);
    this.transport.onerror = (err: Error) => console.error('Transport error', err);
    this.transport.onclose = () => console.log('Transport closed');
  }

  public on(method: string, handler: (params: any) => Promise<any>) {
    this.handlers[method] = handler;
  }

  public async start(): Promise<void> {
    await this.transport.start();
  }

  public async processRequest(requestBody: any): Promise<Response> {
    if (!requestBody || typeof requestBody !== 'object' || requestBody === null) {
      const errorResponseMsg: JSONRPCMessage = {
        jsonrpc: '2.0',
        error: { code: -32600, message: 'Invalid Request: body must be a JSON object.' },
        id: (requestBody && typeof requestBody.id !== 'undefined') ? requestBody.id : null,
      };
      return this.transport.send(errorResponseMsg);
    }

    return this.handleMessage(requestBody as JSONRPCMessage);
  }

  private async handleMessage(msg: JSONRPCMessage): Promise<Response> {
    if (msg.jsonrpc !== '2.0' || !msg.method) {
      const errorMsg: JSONRPCMessage = { jsonrpc: '2.0', error: { code: -32600, message: 'Invalid JSON-RPC request object' }, id: msg.id };
      return this.transport.send(errorMsg);
    }
    const handler = this.handlers[msg.method];
    const responseMsg: JSONRPCMessage = { jsonrpc: '2.0', id: msg.id };
    if (!handler) {
      responseMsg.error = { code: -32601, message: 'Method not found' };
      return this.transport.send(responseMsg);
    }
    try {
      const result = await handler(msg.params);
      responseMsg.result = result;
    } catch (err: any) {
      responseMsg.error = { code: -32000, message: err.message || String(err) };
    }
    return this.transport.send(responseMsg);
  }
}
