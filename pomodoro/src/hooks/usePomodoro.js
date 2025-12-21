import { useEffect, useState, useRef } from "react";

export function usePomodoro(initialSeconds, onFinish) {
    const [seconds, setSeconds] = useState(initialSeconds);
    const [running, setRunning] = useState(false);
    const intervalRef = useRef(null);

    useEffect(() => {
        if (!running) return;

        intervalRef.current = setInterval(() => {
            setSeconds(s => {
                if (s <= 1) {
                    clearInterval(intervalRef.current);
                    onFinish?.();
                    return 0;
                }
                return s - 1;
            });
        }, 1000);

        return () => clearInterval(intervalRef.current);
    }, [running]);

    const reset = secs => {
        clearInterval(intervalRef.current);
        setRunning(false);
        setSeconds(secs);
    };

    return {
        seconds,
        running,
        start: () => setRunning(true),
        pause: () => setRunning(false),
        reset,
    };
}
