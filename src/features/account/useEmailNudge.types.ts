export type EmailNudgeState = "none" | "unconfirmed" | "ready";

export type EmailNudgeAction =
	"add" | "enter_code" | "resend" | "later" | "never" | "undo";

export type EmailDialogStep = "email" | "code" | "done";
