export interface JSONRPCMessage {
  jsonrpc: '2.0';
  method?: string;
  params?: any;
  result?: any;
  id?: string | number;
  error?: any;
}

export interface Transport {
  start(): Promise<void>;
  send(message: JSONRPCMessage): Promise<Response>;
  close(): Promise<void>;
  onclose?: () => void;
  onerror?: (error: Error) => void;
  onmessage?: (message: JSONRPCMessage) => void;
}

// Transport interfaces for MCP communication
