import { createFileRoute, Outlet, useMatch } from "@tanstack/react-router";
import { ManagedArtistPublicPage } from "@/components/ManagedArtistPublicPage";
import { getManagedPublicArtist } from "@/lib/managedPublic.functions";

export const Route = createFileRoute("/artistas/$slug")({
  loader: ({ params }) => getManagedPublicArtist({ data: { slug: params.slug } }),
  head: ({ loaderData }) => {
    const artist = loaderData?.artist;
    const name = artist?.artist_name ?? "Agenda do artista";
    const description = artist?.bio?.slice(0, 180) || `Confira a agenda de shows de ${name}.`;
    const image = artist?.cover_url || artist?.avatar_url;
    return { meta: [
      { title: `${name} — Agenda Point do Ingresso` },
      { name: "description", content: description },
      { property: "og:title", content: `${name} — Agenda de shows` },
      { property: "og:description", content: description },
      { property: "og:type", content: "profile" },
      ...(image ? [{ property: "og:image", content: image }, { name: "twitter:image", content: image }] : []),
      { name: "twitter:card", content: "summary_large_image" },
    ] };
  },
  component: ArtistRoute,
});

function ArtistRoute() {
  const data = Route.useLoaderData();
  const eventMatch = useMatch({ from: "/artistas/$slug/eventos/$eventSlug", shouldThrow: false });
  return <>{!eventMatch && <ManagedArtistPublicPage artist={data.artist} events={data.events} media={data.media} />}<Outlet /></>;
}