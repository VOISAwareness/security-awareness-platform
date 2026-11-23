// Assets
import OnGoingImg from "@/assets/CampaignsAssets/OnGoingCampaignsImage.png";
import ScheduledImg from "@/assets/CampaignsAssets/ScheduledCampaignsImage.png";
import HistoricalImg from "@/assets/CampaignsAssets/HistoricalCampaignsImage.png";
import CancelledImg from "@/assets/CampaignsAssets/CancelledCampaignsImage.png";
export const TAB_CONFIG = {
  ongoing: {
    id: "ongoing",
    title: "On Going Announcements",
    subtitle: "Announcements that currently started and haven't ended yet",
    counterColor: "#818CF8", // Soft Indigo
    img: OnGoingImg,
  },
  scheduled: {
    id: "scheduled",
    title: "Scheduled Announcements",
    subtitle: "Announcements that are scheduled to run in coming days",
    counterColor: "#8ED973", // Green
    img: ScheduledImg,
  },
  historical: {
    id: "historical",
    title: "Historical Announcements",
    subtitle: "Announcements that were successfully ended over time",
    counterColor: "#E57A44", // Orange
    img: HistoricalImg,
  },
  cancelled: {
    id: "cancelled",
    title: "Cancelled Announcements",
    subtitle: "Announcements that were cancelled before or while they ran",
    counterColor: "#EF4444", // Red
    img: CancelledImg,
  },
};