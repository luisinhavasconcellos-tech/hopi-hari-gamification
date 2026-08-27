import SocialPostsPage from "@/components/SocialPostsPage";
import YouTubeStudioPanel from "@/components/YouTubeStudioPanel";

export default function YouTubePage() {
  return (
    <div>
      <div className="px-6 pt-6">
        <YouTubeStudioPanel />
      </div>
      <SocialPostsPage platform="youtube" />
    </div>
  );
}
