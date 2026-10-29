"use client";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { CRUMB_KURSUS, Ikon, Shell } from "@/components/shell";
import { useSesi } from "@/components/sesi";
import { TLX } from "@/lib/konten";

export default function HalBobot() {
  return (
    <Shell drawer={false} crumbs={[...CRUMB_KURSUS, ["NASA-TLX: perbandingan berpasangan"]]}>
      <Isi />
    </Shell>
  );
}

function acak() {
  const S = TLX.skala.map((s) => s.id);
  const pairs: string[][] = [];
  for (let i = 0; i < S.length; i++) for (let j = i + 1; j < S.length; j++) pairs.push(Math.random() < 0.5 ? [S[i], S[j]] : [S[j], S[i]]);
  for (let k = pairs.length - 1; k > 0; k--) { const m = Math.floor(Math.random() * (k + 1)); [pairs[k], pairs[m]] = [pairs[m], pairs[k]]; }
  return pairs;
}

function Isi() {
  const { state, post, ev, simpanDraf } = useSesi();
  const router = useRouter();
  const t = state!.times;
  const [st, setSt] = useState<{ urutan: string[][]; pilihan: string[] } | null>(
    () => (state!.draf["-1"] as { urutan: string[][]; pilihan: string[] } | undefined) ?? state!.pairs);
  const init = useRef(false);
  const byId = Object.fromEntries(TLX.skala.map((s) => [s.id, s]));

  useEffect(() => {
    if (!t.tlx3) return;
    if (t.bobot) { router.replace("/kursus/forum"); return; }
    if (init.current) return;
    init.current = true;
    if (!t.bobot_start) post("/api/langkah", { kunci: "bobot_start" });
    if (!st) {
      const s = { urutan: acak(), pilihan: [] as string[] };
      setSt(s); ev("tlx_pairs_order", { order: s.urutan.map((p) => p.join("-")) });
      simpanDraf(-1, s);
    }
  }, [t, st, router, post, ev]);

  if (!t.tlx3) return <div className="alert alert-warning">Bagian ini terbuka setelah NASA-TLX Blok 3.</div>;
  if (!st) return <p className="muted">Menyiapkan…</p>;

  const i = st.pilihan.length;

  async function pilih(id: string) {
    const pr = st!.urutan[i];
    ev("tlx_pair", { i, a: pr[0], b: pr[1], pilih: id });
    const n = { ...st!, pilihan: [...st!.pilihan, id] };
    setSt(n);
    if (n.pilihan.length >= n.urutan.length) {
      const s = await post("/api/bobot", n);
      if (s) router.push("/kursus/forum");
    } else simpanDraf(-1, n);
  }

  return (
    <>
      <div className="page-header"><Ikon tipe="feedback" besar /><div><h1>NASA-TLX: sumber beban kerja</h1><p className="sub">Bagian terakhir kuesioner</p></div></div>
      <div className="card" style={{ background: "var(--primary-100)", borderColor: "var(--primary-200)" }}>
        {TLX.instruksi_bobot.map((p, k) => <p key={k} style={k === TLX.instruksi_bobot.length - 1 ? { marginBottom: 0 } : undefined}>{p}</p>)}
      </div>
      {i < st.urutan.length && (
        <div id="pair-area">
          <p className="muted" id="pair-progres">Pasangan {i + 1} dari {st.urutan.length}</p>
          <div className="progress" style={{ marginBottom: 12 }}><span style={{ width: (100 * i) / st.urutan.length + "%" }} /></div>
          <div className="pair-row">
            {st.urutan[i].map((id) => (
              <button key={id + i} type="button" className="pair-btn" id={"pair-" + id} data-act={"pair-" + id} onClick={() => pilih(id)}>
                <strong>{byId[id].nama}</strong><span className="muted">{byId[id].en}</span>
              </button>
            ))}
          </div>
        </div>
      )}
      <p className="muted" style={{ fontSize: 12 }}>Sumber instrumen: {TLX.sumber}</p>
    </>
  );
}
