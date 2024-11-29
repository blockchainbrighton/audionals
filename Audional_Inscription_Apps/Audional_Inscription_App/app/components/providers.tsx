// app/providers.tsx
"use client";

import { LaserEyesProvider } from "@omnisat/lasereyes";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <LaserEyesProvider config={{ network: "mainnet" }}>
      {children}
    </LaserEyesProvider>
  );
}