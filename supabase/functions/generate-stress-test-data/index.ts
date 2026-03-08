import { createClient } from "https://esm.sh/@supabase/supabase-js@2.98.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Get RT IDs
    const { data: rts } = await supabase.from("rt").select("id");
    const rtIds = (rts || []).map((r: any) => r.id);

    const firstNames = ["Ahmad", "Muhammad", "Abdul", "Ali", "Umar", "Hasan", "Ibrahim", "Yusuf", "Ismail", "Idris",
      "Fatimah", "Aisyah", "Khadijah", "Maryam", "Zainab", "Siti", "Nur", "Dewi", "Aminah", "Halimah",
      "Rizki", "Rahmat", "Hidayat", "Syahrul", "Fajar", "Dimas", "Bayu", "Agus", "Bambang", "Cahyo",
      "Eko", "Gunawan", "Hendra", "Irfan", "Joko", "Kurniawan", "Lukman", "Mulyadi", "Nugroho", "Oscar"];
    const lastNames = ["Hidayat", "Rahman", "Wijaya", "Santoso", "Pratama", "Saputra", "Kusuma", "Nugraha", "Setiawan", "Wibowo",
      "Utomo", "Suryadi", "Firmansyah", "Ramadhan", "Fadillah", "Maulana", "Hakim", "Syafii", "Haryanto", "Prabowo",
      "Sulistyo", "Wahyudi", "Budiman", "Darmawan", "Effendi", "Fauzi", "Gunadi", "Hartono", "Iskandar", "Jamal"];
    const kategoriMustahik = ["Fakir", "Miskin", "Amil", "Muallaf", "Riqab", "Gharimin", "Fisabilillah", "Ibnu Sabil"];
    const jenisZakat = ["Zakat Fitrah", "Zakat Mal", "Infaq", "Fidyah"];

    const rand = (arr: any[]) => arr[Math.floor(Math.random() * arr.length)];
    const randInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
    const randName = () => `${rand(firstNames)} ${rand(lastNames)}`;

    // Phase 1: Insert 500 mustahik
    console.log("Inserting mustahik...");
    const mustahikRows: any[] = [];
    for (let i = 0; i < 500; i++) {
      mustahikRows.push({
        nama: randName(),
        kategori: rand(kategoriMustahik),
        rt_id: rand(rtIds),
        alamat: `Jl. Mawar No. ${randInt(1, 200)}`,
        status: "RT",
      });
    }
    // Insert in batches of 100
    for (let i = 0; i < mustahikRows.length; i += 100) {
      const batch = mustahikRows.slice(i, i + 100);
      const { error } = await supabase.from("mustahik").insert(batch);
      if (error) console.error("Mustahik insert error:", error.message);
    }

    // Get all mustahik IDs
    const { data: allMustahik } = await supabase.from("mustahik").select("id").limit(1000);
    const mustahikIds = (allMustahik || []).map((m: any) => m.id);

    // Phase 2: Insert 2000 transaksi_zakat with 5000+ detail_zakat
    console.log("Inserting transaksi_zakat...");
    let totalDetails = 0;
    const startDate = new Date("2026-03-01");
    const endDate = new Date("2026-03-08");

    for (let batch = 0; batch < 20; batch++) {
      const transaksiRows: any[] = [];
      for (let i = 0; i < 100; i++) {
        const d = new Date(startDate.getTime() + Math.random() * (endDate.getTime() - startDate.getTime()));
        transaksiRows.push({
          nama_muzakki: randName(),
          rt_id: rand(rtIds),
          status_muzakki: rand(["RT", "Luar RT"]),
          tanggal: d.toISOString().split("T")[0],
        });
      }

      const { data: inserted, error: tErr } = await supabase.from("transaksi_zakat").insert(transaksiRows).select("id");
      if (tErr) { console.error("Transaksi insert error:", tErr.message); continue; }

      // Create detail_zakat for each transaksi
      const detailRows: any[] = [];
      for (const t of (inserted || [])) {
        // Each transaksi gets 1-4 jenis zakat randomly
        const numJenis = randInt(1, 4);
        const selectedJenis = [...jenisZakat].sort(() => Math.random() - 0.5).slice(0, numJenis);

        for (const jenis of selectedJenis) {
          const detail: any = { transaksi_id: t.id, jenis_zakat: jenis };
          if (jenis === "Zakat Fitrah") {
            const jiwa = randInt(1, 8);
            detail.jumlah_jiwa = jiwa;
            detail.jumlah_uang = jiwa * 37500;
            detail.jumlah_beras = jiwa * 2.5;
          } else if (jenis === "Zakat Mal") {
            detail.jumlah_uang = randInt(5, 200) * 10000;
            detail.jumlah_jiwa = 0;
            detail.jumlah_beras = 0;
          } else if (jenis === "Infaq") {
            detail.jumlah_uang = randInt(1, 50) * 10000;
            detail.jumlah_jiwa = 0;
            detail.jumlah_beras = 0;
          } else if (jenis === "Fidyah") {
            detail.jumlah_uang = randInt(1, 30) * 10000;
            detail.jumlah_jiwa = 0;
            detail.jumlah_beras = randInt(2, 20);
          }
          detailRows.push(detail);
        }
      }

      // Insert details in batches
      for (let i = 0; i < detailRows.length; i += 200) {
        const dbatch = detailRows.slice(i, i + 200);
        const { error: dErr } = await supabase.from("detail_zakat").insert(dbatch);
        if (dErr) console.error("Detail insert error:", dErr.message);
      }
      totalDetails += detailRows.length;
      console.log(`Batch ${batch + 1}/20: ${inserted?.length} transaksi, ${detailRows.length} details`);
    }

    // Phase 3: Insert 1000 distribusi
    console.log("Inserting distribusi...");
    for (let batch = 0; batch < 10; batch++) {
      const distRows: any[] = [];
      for (let i = 0; i < 100; i++) {
        const isBeras = Math.random() > 0.5;
        const d = new Date(startDate.getTime() + Math.random() * (endDate.getTime() - startDate.getTime()));
        distRows.push({
          mustahik_id: rand(mustahikIds),
          jenis_bantuan: isBeras ? "Beras" : "Uang",
          sumber_zakat: rand(["Zakat Fitrah", "Zakat Mal", "Infaq", "Fidyah"]),
          jumlah: isBeras ? 0 : randInt(5, 100) * 10000,
          jumlah_beras: isBeras ? randInt(2, 25) : 0,
          tanggal: d.toISOString().split("T")[0],
        });
      }
      const { error } = await supabase.from("distribusi").insert(distRows);
      if (error) console.error("Distribusi insert error:", error.message);
      console.log(`Distribusi batch ${batch + 1}/10`);
    }

    // Get final counts
    const [tzCount, dzCount, mCount, distCount] = await Promise.all([
      supabase.from("transaksi_zakat").select("id", { count: "exact", head: true }),
      supabase.from("detail_zakat").select("id", { count: "exact", head: true }),
      supabase.from("mustahik").select("id", { count: "exact", head: true }),
      supabase.from("distribusi").select("id", { count: "exact", head: true }),
    ]);

    const result = {
      transaksi_zakat: tzCount.count,
      detail_zakat: dzCount.count,
      mustahik: mCount.count,
      distribusi: distCount.count,
      total_details_generated: totalDetails,
    };

    console.log("Done!", result);
    return new Response(JSON.stringify(result), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    console.error("Error:", err);
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
