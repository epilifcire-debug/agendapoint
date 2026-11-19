export type ShareTarget = { label: string; href: string };

export function shareTargets(url: string, text = "Confira minha agenda de shows:"): ShareTarget[] {
  const u = encodeURIComponent(url);
  const t = encodeURIComponent(text);
  return [
    { label: "WhatsApp", href: `https://wa.me/?text=${t}%20${u}` },
    { label: "Telegram", href: `https://t.me/share/url?url=${u}&text=${t}` },
    { label: "Twitter / X", href: `https://twitter.com/intent/tweet?url=${u}&text=${t}` },
    { label: "Facebook", href: `https://www.facebook.com/sharer/sharer.php?u=${u}` },
  ];
}

type Socials = {
  instagram?: string | null;
  tiktok?: string | null;
  twitter?: string | null;
  youtube?: string | null;
  spotify?: string | null;
  soundcloud?: string | null;
  whatsapp?: string | null;
};

function toUrl(value: string, base: string) {
  const v = value.trim();
  if (!v) return "";
  if (/^https?:\/\//i.test(v)) return v;
  return base + v.replace(/^@/, "");
}

export function socialLinks(p: Socials): ShareTarget[] {
  const out: ShareTarget[] = [];
  const push = (label: string, value: string | null | undefined, base: string) => {
    if (!value) return;
    const href = toUrl(value, base);
    if (href) out.push({ label, href });
  };
  push("Instagram", p.instagram, "https://instagram.com/");
  push("TikTok", p.tiktok, "https://tiktok.com/@");
  push("Twitter / X", p.twitter, "https://x.com/");
  push("YouTube", p.youtube, "https://youtube.com/@");
  push("Spotify", p.spotify, "https://open.spotify.com/search/");
  push("SoundCloud", p.soundcloud, "https://soundcloud.com/");
  if (p.whatsapp) {
    const digits = p.whatsapp.replace(/\D/g, "");
    if (digits) out.push({ label: "WhatsApp", href: `https://wa.me/${digits}` });
  }
  return out;
}
