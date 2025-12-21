import { useSettingsStore } from "../store/useSettingsStore";

export default function SoundPicker() {
    const setAlarmSound = useSettingsStore(s => s.setAlarmSound);

    const handleUpload = e => {
        const file = e.target.files[0];
        if (!file) return;
        setAlarmSound(URL.createObjectURL(file));
    };

    return <input type="file" accept="audio/*" onChange={handleUpload} />;
}

const audio = new Audio(alarmSound);
audio.play();
