"use server";

export type FormState = {
  ok: boolean;
  message: string;
};

export async function createTask(_previousState: FormState, formData: FormData): Promise<FormState> {
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();

  if (!title) {
    return { ok: false, message: "タイトルを入力してください。" };
  }

  return {
    ok: true,
    message: `「${title}」を受け付けました。${description ? "説明も確認しました。" : ""}`,
  };
}
