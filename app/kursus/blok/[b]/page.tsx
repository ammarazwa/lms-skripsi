"use client";
import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";

/* Blok dibuka dari halaman Bacaan (/kursus/blok/[b]/bacaan), lalu soal di /kursus/blok/[b]/[no]. Alamat blok tanpa
 * nomor diarahkan ke Bacaan; halaman itu sendiri meneruskan ke soal 1 bila blok tidak punya bahan. */
export default function HalBlok() {
  const b = useParams<{ b: string }>().b;
  const router = useRouter();
  useEffect(() => { router.replace(`/kursus/blok/${b}/bacaan`); }, [b, router]);
  return null;
}
