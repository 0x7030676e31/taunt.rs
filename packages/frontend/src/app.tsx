import { createSignal } from "solid-js";

export default function App() {
    const [count, setCount] = createSignal(0);

    return (
        <div style={{ "text-align": "center", "margin-top": "50px" }}>
            <button onClick={() => setCount(count() + 1)}>Increment</button>
            <h1>Counter: {count()}</h1>
        </div>
    );
}