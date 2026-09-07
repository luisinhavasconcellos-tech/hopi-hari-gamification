import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AuthPage from "@/pages/AuthPage";

const signUp = vi.fn();

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    session: null,
    loading: false,
    signIn: vi.fn(),
    signUp,
    resetPassword: vi.fn(),
  }),
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock("@/components/ui/tabs", () => ({
  Tabs: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TabsList: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TabsTrigger: ({ children }: { children: React.ReactNode }) => <button type="button">{children}</button>,
  TabsContent: ({ value, children }: { value: string; children: React.ReactNode }) =>
    value === "signup" ? <div>{children}</div> : null,
}));

describe("immediate account activation flow", () => {
  beforeEach(() => {
    signUp.mockReset();
    signUp.mockResolvedValue({ error: null });
  });

  it("creates the account without entering an email-verification state", async () => {
    render(
      <MemoryRouter initialEntries={["/auth"]}>
        <AuthPage />
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByLabelText("Nome completo"), { target: { value: "Pessoa Autorizada" } });
    fireEvent.change(screen.getByLabelText("E-mail"), { target: { value: " Equipe@HopiHari.com.br " } });
    fireEvent.change(screen.getByLabelText("Senha", { selector: "#signup-password" }), {
      target: { value: "senha-segura-123" },
    });
    fireEvent.change(screen.getByLabelText("Confirmar senha"), { target: { value: "senha-segura-123" } });
    fireEvent.click(screen.getByRole("button", { name: "Criar conta" }));

    await waitFor(() =>
      expect(signUp).toHaveBeenCalledWith("Equipe@HopiHari.com.br", "senha-segura-123", "Pessoa Autorizada"),
    );
    expect(screen.queryByText("Verifique seu e-mail")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Reenviar e-mail de confirmação" })).not.toBeInTheDocument();
  });
});
