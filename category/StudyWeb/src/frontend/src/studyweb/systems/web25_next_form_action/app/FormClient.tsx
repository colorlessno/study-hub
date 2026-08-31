"use client";

import { useActionState } from "react";
import { createTask, type FormState } from "./actions";

const initialState: FormState = {
  ok: false,
  message: "",
};

export function FormClient() {
  const [state, formAction, pending] = useActionState(createTask, initialState);

  return (
    <form action={formAction}>
      <label htmlFor="title">タイトル</label>
      <input id="title" name="title" />
      <label htmlFor="description">説明</label>
      <textarea id="description" name="description" rows={4} />
      <button type="submit" disabled={pending}>
        {pending ? "送信中" : "送信"}
      </button>
      {state.message && (
        <p className={state.ok ? "result success" : "result error"} aria-live="polite">
          {state.message}
        </p>
      )}
    </form>
  );
}
