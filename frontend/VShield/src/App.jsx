import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { UserTypeProvider, useUserType } from './UserTypeContext/UserTypeContext';

// Layout & Main Views
import Layout from './GlobalComponents/Layout';
import LandingPage from './Pages/LandingPage/LandingPage';
import HomeScreen from './Pages/HomeScreen/HomeScreen';

// 🌟 Import MySpace Page
import MySpace from './Pages/UserProfileandPointsScoreing/MySpace';

// 🌟 Import Gamification Engine Page
import GamificationEngine from './Pages/GamificationEngine/GamificationEngine';

// 🌟 Import Email IDs & Domains Page
import EmailIDsAndDomains from './Pages/EmailIDsandDomains/EmailIDsAndDomains';

// 🌟 Import Landing Page Catalogue Page
import LandingPageCatalogue from './Pages/LandingPageCatalogue/LandingPageCatalogue';

// 🌟 Import Start New Campaign Page
import ChooseAScenario from './Pages/StartCampaign/ChooseAScenario';
import DetailsAndSettings from './Pages/StartCampaign/DetailsAndSettings';
import CampaignEmail from './Pages/StartCampaign/CampaignEmail';
import LandingPageDetails from './Pages/StartCampaign/LandingPageDetails';
import AddTrainingPath from './Pages/StartCampaign/AddTrainingPath';
import ReviewAndPublishCampaign from './Pages/StartCampaign/ReviewAndPublishCampaign';

// 🌟 Import Campaign Lifecycle Pages
import CampaignsHub from './Pages/Campaigns/CampaignsHub';
import RequestsAndApprovals from './Pages/Approvals/RequestsAndApprovals';

// 🌟 Import UserDLs Suite
import UserDLsLandingPage from './Pages/UserDLs/UserDLsLandingPage';
import UserListUploadViaDL from './Pages/UserDLs/UserListUploadViaDL';
import UserListViaBulkUpload from './Pages/UserDLs/UserListViaBulkUpload';

// Protected Route Wrapper
const ProtectedRoute = ({ children, requiredScreen }) => {
  const { user, hasAccess } = useUserType();
  if (!user) return <Navigate to="/" replace />;
  if (requiredScreen && !hasAccess(requiredScreen)) {
    return <div className="p-10 text-red-500 font-bold">Access Denied.</div>;
  }
  return children;
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
          <Route path="/" element={<LandingPage />} />

          {/* Protected Application Layout with Sidebar */}
          <Route
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            {/* Dashboard / Home */}
            <Route path="/home" element={<HomeScreen />} />

            {/* 🌟 My Space Route */}
            <Route path="/my-space" element={<MySpace />} />

            {/* 🌟 Gamification Engine Route */}
            <Route path="/gamification" element={<GamificationEngine />} />

            {/* 🌟 Email IDs & Domains Route */}
            <Route path="/email-domains" element={<EmailIDsAndDomains />} />
            
            {/* 🌟 Landing Page Catalogue Route */}
            <Route path="/landing-page-catalogue" element={<LandingPageCatalogue />} />
            
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
            {/* NB: /start-campaign is already routed to the wizard above; the
                duplicate placeholder that used to sit here was dead code. */}
            <Route path="/create-scenario" element={<PlaceholderPage title="Create Scenario" />} />
            <Route path="/campaigns" element={<CampaignsHub />} />

            {/* Training & Learning Routes */}
            <Route path="/add-training" element={<PlaceholderPage title="Training Matrix" />} />
            <Route path="/my-training" element={<PlaceholderPage title="My Training Path" />} />

            {/* Communications & Directories */}
            <Route path="/announcements" element={<PlaceholderPage title="Security Announcements" />} />

            {/* Approvals & Analytics */}
            <Route path="/requests-approvals" element={<RequestsAndApprovals />} />
            <Route path="/analytics" element={<PlaceholderPage title="Dashboard & Analytics" />} />

            {/* Fallback inside dashboard */}
            <Route path="*" element={<Navigate to="/home" replace />} />
          </Route>

          {/* Global Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </UserTypeProvider>
  );
}

export default App;