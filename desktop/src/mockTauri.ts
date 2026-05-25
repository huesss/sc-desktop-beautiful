declare global {
  interface Window {
    __TAURI_INTERNALS__?: {
      plugins: Record<string, unknown>;
      metadata: Record<string, unknown>;
      invoke: (cmd: string, args?: Record<string, unknown>) => Promise<unknown>;
      transformCallback: (callback?: (data: unknown) => void, once?: boolean) => number;
      unregisterCallback: (id: number) => void;
      callbacks?: Map<number, (data: unknown) => void>;
    };
    __TAURI_EVENT_PLUGIN_INTERNALS__: {
      unregisterListener: (event: string, eventId: number) => void;
    };
    __TAURI_IPC__?: (message: { cmd?: string }) => Promise<unknown>;
    __TAURI__?: {
      core: {
        invoke: (cmd: string, args?: Record<string, unknown>) => Promise<unknown>;
        transformCallback: (cb: (data: unknown) => void) => (data: unknown) => void;
      };
      event: {
        listen: () => Promise<() => void>;
        emit: () => Promise<void>;
      };
    };
  }
}

function mockInvoke(cmd: string, _args?: Record<string, unknown>) {
  console.log(`🤖 Mock Invoke: ${cmd}`, _args);
  if (cmd === 'get_server_ports') return Promise.resolve([3000, 3001]);
  return Promise.resolve({});
}

if (typeof window !== 'undefined' && !window.__TAURI_INTERNALS__) {
  const callbacks = new Map<number, (data: unknown) => void>();
  let callbackId = 0;

  window.__TAURI_INTERNALS__ = {
    plugins: {},
    metadata: {},
    invoke: mockInvoke,
    transformCallback(callback, once = false) {
      const id = ++callbackId;
      if (callback) {
        callbacks.set(id, (data) => {
          if (once) callbacks.delete(id);
          callback(data);
        });
      }
      return id;
    },
    unregisterCallback(id) {
      callbacks.delete(id);
    },
    callbacks,
  };

  window.__TAURI_EVENT_PLUGIN_INTERNALS__ = {
    unregisterListener: () => {},
  };

  window.__TAURI_IPC__ = async (message) => {
    console.log('🤖 Mock Tauri IPC Call:', message);
    if (message.cmd === 'get_server_ports') {
      return [3000, 3001];
    }
    return {};
  };

  window.__TAURI__ = {
    core: {
      invoke: mockInvoke,
      transformCallback: (cb) => cb,
    },
    event: {
      listen: async () => () => {},
      emit: async () => {},
    },
  };
}

export {};
