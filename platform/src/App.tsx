import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Sidebar from "@/components/layout/Sidebar";
import DashboardPage from "@/pages/DashboardPage";
import PostsPage from "@/pages/PostsPage";
import PostDetailPage from "@/pages/PostDetailPage";
import TikTokPage from "@/pages/TikTokPage";
import LinkedInPage from "@/pages/LinkedInPage";
import FacebookPage from "@/pages/FacebookPage";
import YouTubePage from "@/pages/YouTubePage";
import GrowthStrategyPage from "@/pages/GrowthStrategyPage";
import BenchmarksPage from "@/pages/BenchmarksPage";
import FollowerDatabasePage from "@/pages/FollowerDatabasePage";
import DataSourcesPage from "@/pages/DataSourcesPage";
import AudienceIntelligencePage from "@/pages/AudienceIntelligencePage";
import ChannelsPage from "@/pages/audience/ChannelsPage";
import SalesChannelsPage from "@/pages/audience/SalesChannelsPage";
import SalesFunnelPage from "@/pages/audience/SalesFunnelPage";
import VisitorsPage from "@/pages/audience/VisitorsPage";
import AttendancePage from "@/pages/audience/AttendancePage";
import PerCapitaPage from "@/pages/audience/PerCapitaPage";
import ProfilePage from "@/pages/audience/ProfilePage";
import SegmentsPage from "@/pages/audience/SegmentsPage";
import ProductsPage from "@/pages/audience/ProductsPage";
import AttractionsPage from "@/pages/audience/AttractionsPage";
import HeatmapsPage from "@/pages/audience/HeatmapsPage";
import WeekdaysPage from "@/pages/audience/WeekdaysPage";
import EventsPage from "@/pages/audience/EventsPage";
import CampaignsPage from "@/pages/audience/CampaignsPage";
import InfluencersPage from "@/pages/audience/InfluencersPage";
import InfluencerPlatformPage from "@/pages/audience/InfluencerPlatformPage";
import InfluencerNichePage from "@/pages/audience/InfluencerNichePage";
import LoyaltyPage from "@/pages/audience/LoyaltyPage";
import InsightsPage from "@/pages/audience/InsightsPage";
import ContentPlanPage from "@/pages/audience/ContentPlanPage";
import OperationsPage from "@/pages/audience/OperationsPage";
import AdminPage from "@/pages/audience/AdminPage";
import CompetitiveIntelligencePage from "@/pages/audience/CompetitiveIntelligencePage";
import IdentityPage from "@/pages/audience/IdentityPage";
import TransparencyPage from "@/pages/audience/TransparencyPage";
import ReputationPage from "@/pages/audience/ReputationPage";
import XListeningPage from "@/pages/audience/XListeningPage";
import CrmLeadsPage from "@/pages/audience/CrmLeadsPage";
import SearchDemandPage from "@/pages/audience/SearchDemandPage";
import GenderAuditPage from "@/pages/audience/GenderAuditPage";
import FollowerImportPage from "@/pages/admin/FollowerImportPage";
import DomainSetupPage from "@/pages/DomainSetupPage";
import ConsentBanner from "@/components/ConsentBanner";
import NotFound from "@/pages/NotFound";
import AuthPage from "@/pages/AuthPage";
import OAuthConsent from "@/pages/OAuthConsent";
import UsersPage from "@/pages/UsersPage";
import ResetPasswordPage from "@/pages/ResetPasswordPage";
import ProtectedRoute from "@/components/ProtectedRoute";
import { AuthProvider } from "@/hooks/useAuth";

const queryClient = new QueryClient();

function AppShell() {
  return (
    <ProtectedRoute>
      <div className="flex min-h-screen bg-background text-foreground font-sans">
        <Sidebar />
        <main className="flex-1 min-w-0 w-full lg:ml-64 pt-14 lg:pt-0 pb-28">
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/posts" element={<PostsPage />} />
            <Route path="/posts/:id" element={<PostDetailPage />} />
            <Route path="/tiktok" element={<TikTokPage />} />
            <Route path="/linkedin" element={<LinkedInPage />} />
            <Route path="/facebook" element={<FacebookPage />} />
            <Route path="/youtube" element={<YouTubePage />} />
            <Route path="/growth" element={<GrowthStrategyPage />} />
            <Route path="/benchmarks" element={<BenchmarksPage />} />
            <Route path="/followers" element={<FollowerDatabasePage />} />
            <Route path="/sources" element={<DataSourcesPage />} />
            <Route path="/dominio" element={<DomainSetupPage />} />
            <Route path="/users" element={<ProtectedRoute adminOnly><UsersPage /></ProtectedRoute>} />
            <Route path="/admin/seguidores/importar" element={<FollowerImportPage />} />

            <Route path="/audience" element={<AudienceIntelligencePage />} />
            <Route path="/audience/channels" element={<ChannelsPage />} />
            <Route path="/audience/sales-channels" element={<SalesChannelsPage />} />
            <Route path="/audience/funnel" element={<SalesFunnelPage />} />
            <Route path="/audience/visitors" element={<VisitorsPage />} />
            <Route path="/audience/attendance" element={<AttendancePage />} />
            <Route path="/audience/profile" element={<ProfilePage />} />
            <Route path="/audience/segments" element={<SegmentsPage />} />
            <Route path="/audience/percapita" element={<PerCapitaPage />} />
            <Route path="/audience/products" element={<ProductsPage />} />
            <Route path="/audience/attractions" element={<AttractionsPage />} />
            <Route path="/audience/heatmaps" element={<HeatmapsPage />} />
            <Route path="/audience/weekdays" element={<WeekdaysPage />} />
            <Route path="/audience/events" element={<EventsPage />} />
            <Route path="/audience/campaigns" element={<CampaignsPage />} />
            <Route path="/audience/influencers" element={<InfluencersPage />} />
            <Route path="/audience/influencers/:platform" element={<InfluencerPlatformPage />} />
            <Route path="/audience/influencers/:platform/:niche" element={<InfluencerNichePage />} />
            <Route path="/audience/loyalty" element={<LoyaltyPage />} />
            <Route path="/audience/insights" element={<InsightsPage />} />
            <Route path="/audience/content-plan" element={<ContentPlanPage />} />
            <Route path="/audience/operations" element={<OperationsPage />} />
            <Route path="/audience/crm" element={<CrmLeadsPage />} />
            <Route path="/audience/search-demand" element={<SearchDemandPage />} />
            <Route path="/audience/competitive" element={<CompetitiveIntelligencePage />} />
            <Route path="/audience/reputation" element={<ReputationPage />} />
            <Route path="/audience/x-listening" element={<XListeningPage />} />
            <Route path="/audience/identity" element={<IdentityPage />} />
            <Route path="/audience/gender-audit" element={<GenderAuditPage />} />
            <Route path="/audience/transparency" element={<TransparencyPage />} />
            <Route path="/audience/admin" element={<AdminPage />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </main>
      </div>
    </ProtectedRoute>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <BrowserRouter>
          <AuthProvider>
            <Routes>
              <Route path="/auth" element={<AuthPage />} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />
              <Route path="/.lovable/oauth/consent" element={<OAuthConsent />} />
              <Route path="*" element={<AppShell />} />
            </Routes>
          </AuthProvider>
          <ConsentBanner />

        </BrowserRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}
