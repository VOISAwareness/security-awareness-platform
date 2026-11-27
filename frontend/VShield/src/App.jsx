import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { UserTypeProvider, useUserType } from './UserTypeContext/UserTypeContext';

// Layout (the shell: sidebar and top bar) loads with the app; every page's
// code loads when it is first opened (React.lazy), so a visit downloads only
// what it shows. Layout shows the app's spinner while a page arrives.
import Layout from './GlobalComponents/Layout';
import PageLoading from './GlobalComponents/PageLoading';
import ErrorBoundary from './GlobalComponents/ErrorBoundary';
const LandingPage = lazy(() => import('./Pages/LandingPage/LandingPage'));
const HomeScreen = lazy(() => import('./Pages/HomeScreen/HomeScreen'));

// Import Scenario Pages
const Scenarios = lazy(() => import('./Pages/Scenarios/Scenarios'));
const NewScenario = lazy(() => import('./Pages/Scenarios/CreateNewScenario/CreateNewScenario'));

// 🌟 Import MySpace Page
const MySpace = lazy(() => import('./Pages/UserProfileandPointsScoreing/MySpace'));

// 🌟 Import Gamification Engine Page
const GamificationEngine = lazy(() => import('./Pages/GamificationEngine/GamificationEngine'));

// 🌟 Import Email IDs & Domains Page
const EmailIDsAndDomains = lazy(() => import('./Pages/EmailIDsandDomains/EmailIDsAndDomains'));

// 🌟 Import Landing Page Catalogue Page
const LandingPageCatalogue = lazy(() => import('./Pages/LandingPageCatalogue/LandingPageCatalogue'));

// 🌟 Insights (the analytics page)
const Insights = lazy(() => import('./Pages/Insights/Insights'));

// 🌟 Campaign lifecycle pages (wired to the backend)
const Campaigns = lazy(() => import('./Pages/Campaigns/Campaigns'));
const RequestAndApprovals = lazy(() => import('./Pages/RequestsAndApprovals/RequestAndApprovals'));

// 🌟 Announcements: the list, a three-step send (details, email, review) and a new announcement
const Announcements = lazy(() => import('./Pages/Announcement/Announcement'));
const AnnouncementRequestAndApprovals = lazy(() => import('./Pages/Announcement/AnnouncementRequestsApprovals/AnnouncementRequestsApprovals'));
const AnnouncementsDetailsAndSettings = lazy(() => import('./Pages/Announcement/RollOutAnnouncement/AnnouncementTemplateDetails/AnnouncementsDetailsAndSettings'));
const AnnouncementsTemplateEmail = lazy(() => import('./Pages/Announcement/RollOutAnnouncement/AnnouncementTemplateEmail/AnnouncementTemplateEmail'));
const AnnouncementsReviewPublish = lazy(() => import('./Pages/Announcement/RollOutAnnouncement/AnnouncementTemplateReview/AnnouncementsReviewPublish'));
const AnnouncementTemplateDetails = lazy(() => import('./Pages/Announcement/CreateAnnouncement/AnnouncementTemplateDetails/AnnouncementTemplateDetails'));

// 🌟 Leaderboard
const Leaderboard = lazy(() => import('./Pages/Leaderboard/Leaderboard'));

// 🌟 Training (LMS): paths, videos, quizzes, certificates, SCORM packages, approvals
const Training = lazy(() => import('./Pages/Training/Training'));

// 🌟 Import Start New Campaign Page
const ChooseAScenario = lazy(() => import('./Pages/StartCampaign/ChooseAScenario'));
const DetailsAndSettings = lazy(() => import('./Pages/StartCampaign/DetailsAndSettings'));
const CampaignEmail = lazy(() => import('./Pages/StartCampaign/CampaignEmail'));
const LandingPageDetails = lazy(() => import('./Pages/StartCampaign/LandingPageDetails'));
const AddTrainingPath = lazy(() => import('./Pages/StartCampaign/AddTrainingPath'));
const ReviewAndPublishCampaign = lazy(() => import('./Pages/StartCampaign/ReviewAndPublishCampaign'));

// 🌟 Import UserDLs Suite
const UserDLsLandingPage = lazy(() => import('./Pages/UserDLs/UserDLsLandingPage'));
const UserListUploadViaDL = lazy(() => import('./Pages/UserDLs/UserListUploadViaDL'));
const UserListViaBulkUpload = lazy(() => import('./Pages/UserDLs/UserListViaBulkUpload'));

// 🌟 My Training (a person's own training: pending, history, each path's details)
const MyTraining = lazy(() => import('./Pages/MyTraining/MyTraining'));
const TrainingDetails = lazy(() => import('./Pages/MyTraining/PendingTraining/StartNewTraining'));
const AnnouncementHistory = lazy(() => import('./Pages/Announcement/AnnouncementHistory/AnnouncementHistory'));

// Protected Route Wrapper with automatic fallback routing
const ProtectedRoute = ({ children, requiredScreen }) => {
  const { user, hasAccess, getDefaultRoute } = useUserType();
  if (!user) return <Navigate to="/" replace />;
  if (requiredScreen && !hasAccess(requiredScreen)) {
    return <Navigate to={getDefaultRoute()} replace />;
  }
  return children;
};

// Component to dynamically navigate to the active user's default route
const DashboardFallback = () => {
  const { getDefaultRoute } = useUserType();
  return <Navigate to={getDefaultRoute()} replace />;
};

// Generic Placeholder Component for WIP Sidebar Pages
const PlaceholderPage = ({ title }) => (
  <div className="p-8 select-none">
    <div className="p-6 rounded-2xl bg-white dark:bg-[#15161a] border border-slate-200 dark:border-white/5 shadow-sm">
      <h2 className="text-xl font-black uppercase text-slate-900 dark:text-white tracking-tight">
        {title}
      </h2>
      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
        This security module is currently in active development.
      </p>
    </div>
  </div>
);

function App() {
  return (
    <UserTypeProvider>
      <Router>
        <Routes>
          {/* Public Landing Page */}
          <Route
            path="/"
            element={
              <ErrorBoundary>
                <Suspense fallback={<PageLoading show surface="page" />}>
                  <LandingPage />
                </Suspense>
              </ErrorBoundary>
            }
          />

          {/* Protected Application Layout with Sidebar */}
          <Route
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            {/* Dashboard / Home (Protected: restricted to Admin, Campaign Creator & Manager) */}
            <Route
              path="/home"
              element={
                <ProtectedRoute requiredScreen="home">
                  <HomeScreen />
                </ProtectedRoute>
              }
            />

            {/* 🌟 My Space Route */}
            <Route path="/my-space" element={<MySpace />} />

            {/* 🌟 Gamification Engine Route */}
            <Route path="/gamification" element={<GamificationEngine />} />

            {/* 🌟 Email IDs & Domains Route */}
            <Route path="/email-domains" element={<EmailIDsAndDomains />} />

            {/* 🌟 Landing Page Catalogue Route */}
            <Route path="/landing-page-catalogue" element={<LandingPageCatalogue />} />

            {/* 🌟 Campaign lifecycle (wired to the backend) */}
            <Route path="/campaigns" element={<Campaigns />} />
            <Route path="/requests-approvals" element={<RequestAndApprovals />} />

            {/* 🌟 Insights Route */}
            <Route path="/analytics" element={<Insights />} />

            {/* 🌟 Leaderboard Route */}
            <Route
              path="/leaderboard"
              element={
                <ProtectedRoute requiredScreen="leaderboard">
                  <Leaderboard />
                </ProtectedRoute>
              }
            />

            {/* 🌟 Start New Campaign Page Route */}
            <Route path="/start-campaign" element={<ChooseAScenario />} />
            <Route path="/start-campaign/details" element={<DetailsAndSettings />} />
            <Route path="/start-campaign/email" element={<CampaignEmail />} />
            <Route path="/start-campaign/landing-page" element={<LandingPageDetails />} />
            <Route path="/start-campaign/training" element={<AddTrainingPath />} />
            <Route path="/start-campaign/review" element={<ReviewAndPublishCampaign />} />

            {/* 🌟 User Lists & DLs Suite */}
            <Route path="/user-dls" element={<UserDLsLandingPage />} />
            <Route path="/user-lists/add-dl" element={<UserListUploadViaDL />} />
            <Route path="/user-lists/bulk-upload" element={<UserListViaBulkUpload />} />

            {/* Campaign Management Routes */}
            <Route path="/create-scenario" element={<Scenarios />} />
            <Route path="/new-scenario" element={<NewScenario />} />
            <Route path="/new-scenario/:step" element={<NewScenario />} />

            {/* Training & Learning Routes */}
            <Route path="/training" element={<Training />} />
            <Route path="/add-training" element={<PlaceholderPage title="Training Matrix" />} />
            <Route path="/my-training" element={<MyTraining />} />
            <Route path="/my-training/details/:trainingPathID" element={<TrainingDetails />} />

            {/* Communications & Directories */}
            <Route path="/announcements" element={<Announcements />} />
            <Route path="/announcements/approvals" element={<AnnouncementRequestAndApprovals />} />
            <Route path="/announcements/history" element={<AnnouncementHistory />} />
            <Route path="/announcements/details" element={<AnnouncementsDetailsAndSettings />} />
            <Route path="/announcements/email" element={<AnnouncementsTemplateEmail />} />
            <Route path="/announcements/review" element={<AnnouncementsReviewPublish />} />
            <Route path="/new-announcement" element={<AnnouncementTemplateDetails />} />
            <Route path="/new-announcement/:step" element={<AnnouncementTemplateDetails />} />

            {/* Fallback inside dashboard -> Route to user role default */}
            <Route path="*" element={<DashboardFallback />} />
          </Route>

          {/* Global Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </UserTypeProvider>
  );
}

export default App;