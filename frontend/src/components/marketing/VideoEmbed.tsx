/* Reusable YouTube embed. Replace YOUTUBE_VIDEO_ID with the real id once the
   demo is published — every place that shows the video reads it from here. */
export const YOUTUBE_VIDEO_ID = 'YOUR_VIDEO_ID'

export default function VideoEmbed({
  videoId = YOUTUBE_VIDEO_ID,
  badge,
  title = 'RAG Starter product demo',
}: {
  videoId?: string
  badge?: string
  title?: string
}) {
  const src = `https://www.youtube-nocookie.com/embed/${videoId}?rel=0&modestbranding=1`

  return (
    <div className="video-frame">
      {badge && <span className="video-frame__badge">{badge}</span>}
      <div className="video-frame__ratio">
        <iframe
          src={src}
          title={title}
          loading="lazy"
          allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
        />
      </div>
    </div>
  )
}
