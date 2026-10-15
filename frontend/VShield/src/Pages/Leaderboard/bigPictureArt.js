// The Big Picture's clay art: plasticine line icons, matte rope strokes seen
// straight on, as on Campaigns and Requests & Approvals; and the tints that
// go with them.
import ClayAttention from '../../assets/LeaderboardAssets/ClayAttention.png';
import ClayGoingWell from '../../assets/LeaderboardAssets/ClayGoingWell.png';
import ClayNext from '../../assets/LeaderboardAssets/ClayNext.png';
import ClayTrendDown from '../../assets/LeaderboardAssets/ClayTrendDown.png';
import ClayTrendFlat from '../../assets/LeaderboardAssets/ClayTrendFlat.png';
import ClayTrendUp from '../../assets/LeaderboardAssets/ClayTrendUp.png';

/** One clay icon per tone of finding: needs attention, going well, what could happen next. */
export const TONE_ART = { bad: ClayAttention, good: ClayGoingWell, watch: ClayNext };

/** One clay icon per verdict: which way the board moved. */
export const VERDICT_ART = { improving: ClayTrendUp, steady: ClayTrendFlat, slipping: ClayTrendDown };

/**
 * Soft tints behind each tone (a wash and its edge), per theme. Text never
 * takes these colours; they only set the mood of a panel.
 */
export const TONE_TINT = {
  light: {
    bad: { wash: 'linear-gradient(135deg,#FFF1F0 0%,#FFF8F7 60%,#FFFFFF 100%)', edge: '#FBDCDA' },
    good: { wash: 'linear-gradient(135deg,#E9FAF6 0%,#F4FCFA 60%,#FFFFFF 100%)', edge: '#C9EEE7' },
    watch: { wash: 'linear-gradient(135deg,#EFEEFF 0%,#F6F5FF 60%,#FFFFFF 100%)', edge: '#DCD9FB' },
  },
  dark: {
    bad: { wash: 'linear-gradient(135deg,rgba(232,99,95,0.16) 0%,rgba(232,99,95,0.05) 70%,rgba(232,99,95,0.02) 100%)', edge: 'rgba(232,99,95,0.28)' },
    good: { wash: 'linear-gradient(135deg,rgba(22,163,148,0.18) 0%,rgba(22,163,148,0.06) 70%,rgba(22,163,148,0.02) 100%)', edge: 'rgba(22,163,148,0.30)' },
    watch: { wash: 'linear-gradient(135deg,rgba(124,116,240,0.20) 0%,rgba(124,116,240,0.07) 70%,rgba(124,116,240,0.02) 100%)', edge: 'rgba(124,116,240,0.32)' },
  },
};
