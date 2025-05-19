import React, { useEffect, useRef, useState, useCallback } from 'react';
import Codemirror from 'codemirror';
import 'codemirror/lib/codemirror.css';
import 'codemirror/theme/erlang-dark.css';
import 'codemirror/mode/javascript/javascript';
import 'codemirror/addon/edit/closetag';
import 'codemirror/addon/edit/closebrackets';
import ACTIONS from '../Actions';

const Editor = ({ socketRef, roomId, onCodeChange }) => {
  const editorRef = useRef(null);
  const [output, setOutput] = useState('');

  // Memoize onCodeChange if possible (if it's defined inline in parent)
  // If you control parent component, wrap its onCodeChange with useCallback.
  const memoizedOnCodeChange = useCallback(
    (code) => {
      onCodeChange(code);
    },
    [onCodeChange]
  );

  useEffect(() => {
    editorRef.current = Codemirror.fromTextArea(
      document.getElementById('realtimeEditor'),
      {
        mode: { name: 'javascript', json: true },
        theme: 'erlang-dark',
        autoCloseTags: true,
        autoCloseBrackets: true,
        lineNumbers: true,
      }
    );

    const handleChange = (instance, changes) => {
      const { origin } = changes;
      const code = instance.getValue();
      memoizedOnCodeChange(code);

      if (origin !== 'setValue' && socketRef.current) {
        socketRef.current.emit(ACTIONS.CODE_CHANGE, {
          roomId,
          code,
        });
      }
    };

    editorRef.current.on('change', handleChange);

    // Cleanup editor event on unmount
    return () => {
      if (editorRef.current) {
        editorRef.current.off('change', handleChange);
      }
    };
  }, [memoizedOnCodeChange, roomId, socketRef]);

  useEffect(() => {
    if (!socketRef.current) return;

    const socket = socketRef.current;

    const codeChangeHandler = ({ code }) => {
      if (code !== null && editorRef.current) {
        editorRef.current.setValue(code);
      }
    };

    socket.on(ACTIONS.CODE_CHANGE, codeChangeHandler);

    return () => {
      socket.off(ACTIONS.CODE_CHANGE, codeChangeHandler);
    };
  }, [socketRef]);

  const runCode = () => {
    const code = editorRef.current.getValue();
    let result = '';

    try {
      const originalLog = console.log;
      console.log = (...args) => {
        result += args.join(' ') + '\n';
      };

      // Safer than eval, but still be cautious running arbitrary code
      // eslint-disable-next-line no-new-func
      new Function('"use strict";' + code)();

      console.log = originalLog;
    } catch (err) {
      result = `Error: ${err.message}`;
    }

    setOutput(result);
  };

  return (
    <div>
      <textarea id="realtimeEditor" />
      <button onClick={runCode} style={buttonStyle}>
        Run Code
      </button>
      <pre style={outputStyle}>{output}</pre>
    </div>
  );
};

const buttonStyle = {
  marginTop: '10px',
  padding: '8px 16px',
  background: '#444',
  color: '#fff',
  border: 'none',
  cursor: 'pointer',
  fontSize: '16px',
  borderRadius: '4px',
};

const outputStyle = {
  background: '#1e1e1e',
  color: '#0f0',
  padding: '10px',
  marginTop: '10px',
  borderRadius: '4px',
  minHeight: '60px',
  whiteSpace: 'pre-wrap',
};

export default Editor;
