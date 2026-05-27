import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { LogEntry, LogType } from '../types';

export function useLogs() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [showAllLogs, setShowAllLogs] = useState(false);
  const [logsMinimized, setLogsMinimized] = useState(true);
  const logRef = useRef<HTMLDivElement>(null);

  const addLog = useCallback((msg: string, type: LogType = 'info') => {
    setLogs(prev => [...prev, { msg, type, time: new Date().toLocaleTimeString() }].slice(-500));
  }, []);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [logs]);

  const visibleLogs = useMemo(() => showAllLogs ? logs : logs.slice(-40), [logs, showAllLogs]);

  return {
    addLog,
    logRef,
    logs,
    logsMinimized,
    setLogsMinimized,
    setShowAllLogs,
    showAllLogs,
    visibleLogs,
  };
}
