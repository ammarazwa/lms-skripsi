"use client";
/* Perekam layar opsional (Contentsquare = akun "Hotjar" baru). Aktif hanya bila NEXT_PUBLIC_CONTENTSQUARE_TAG diisi,
 * dan tidak dimuat di halaman fasilitator. Log interaksi utama tetap dari logger LMS sendiri (components/sesi.tsx). */
import Script from "next/script";
import { usePathname } from "next/navigation";
import { CONFIG } from "@/lib/config";

export function Perekam() {
  const path = usePathname();
  if (!CONFIG.CONTENTSQUARE_TAG || path.startsWith("/fasilitator")) return null;
  return <Script id="cs-tag" src={`https://t.contentsquare.net/uxa/${CONFIG.CONTENTSQUARE_TAG}.js`} strategy="afterInteractive" />;
}
