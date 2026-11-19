import { createFileRoute } from "@tanstack/react-router";
import { ManagedEventPublicPage } from "@/components/ManagedArtistPublicPage";
import { getManagedPublicEvent } from "@/lib/managedPublic.functions";

export const Route = createFileRoute("/artistas/$slug/eventos/$eventSlug")({
  loader: ({ params }) => getManagedPublicEvent({ data: { artistSlug: params.slug, eventSlug: params.eventSlug } }),
  head: ({ loaderData }) => {
    const artist = loaderData?.artist;
    const event = loaderData?.event;
    const title = event ? `${event.title} — ${artist?.artist_name ?? "Agenda Point do Ingresso"}` : "Evento — Agenda Point do Ingresso";
    const location = event ? [event.venue, event.city, event.state].filter(Boolean).join(" · ") : "";
    const description = event ? `${new Intl.DateTimeFormat("pt-BR", { dateStyle: "long" }).format(new Date(event.starts_at))}${location ? ` · ${location}` : ""}` : "Confira as informações do evento.";
    const image = event?.banner_url || artist?.cover_url || artist?.avatar_url;
    return { meta: [
      { title }, { name: "description", content: description },
      { property: "og:title", content: title }, { property: "og:description", content: description }, { property: "og:type", content: "event" },
      ...(image ? [{ property: "og:image", content: image }, { name: "twitter:image", content: image }] : []),
      { name: "twitter:card", content: "summary_large_image" },
    ] };
  },
  component: EventRoute,
});

function EventRoute() { const data = Route.useLoaderData(); return <ManagedEventPublicPage artist={data.artist} event={data.event} />; }