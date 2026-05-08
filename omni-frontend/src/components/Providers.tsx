import { ToastProvider } from "@/components/ui/Toast";
import { ProfileProvider } from "@/context/ProfileContext";
import { ReactNode } from "react";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ToastProvider>
      <ProfileProvider>
        {children}
      </ProfileProvider>
    </ToastProvider>
  );
}
