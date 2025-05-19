import React, { useEffect, useRef, useState } from 'react';
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

    editorRef.current.on('change', (instance, changes) => {
      const { origin } = changes;
      const code = instance.getValue();
      onCodeChange(code);
      if (origin !== 'setValue') {
        socketRef.current.emit(ACTIONS.CODE_CHANGE, {
          roomId,
          code,
        });
      }
    });
  }, []);

  useEffect(() => {
    if (socketRef.current) {
      socketRef.current.on(ACTIONS.CODE_CHANGE, ({ code }) => {
        if (code !== null) {
          editorRef.current.setValue(code);
        }
      });
    }

    return () => {
      socketRef.current.off(ACTIONS.CODE_CHANGE);
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
      eval(code); // ⚠️ Only use eval with trusted input
      console.log = originalLog;
    } catch (err) {
      result = `Error: ${err.message}`;
    }
    setOutput(result);
  };

  return (
    <div>
      <textarea id="realtimeEditor"></textarea>
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
