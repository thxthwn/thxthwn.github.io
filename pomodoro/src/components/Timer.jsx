import { useSettingsStore } from "../store/useSettingsStore";

export default function Timer({ seconds }) {
    const { font, colors } = useSettingsStore();

    const min = String(Math.floor(seconds / 60)).padStart(2, "0");
    const sec = String(seconds % 60).padStart(2, "0");

    return (
        <div
            style={{
                fontFamily: font,
                color: colors.text,
                fontSize: "6rem",
                letterSpacing: "-0.05em",
            }}
        >
            {min}:{sec}
        </div>
    );
}
