/**
 * PUBLIC SERVICE API — the only server functions UI code may call.
 * Signatures are frozen; implementations live in the sibling files.
 * All functions are synchronous (better-sqlite3) and server-only.
 */

// ---- directory + university ---------------------------------------------
export {
  getUniversity,
  listPersonas,
  listStaff,
  previewCsv,
  importCsv,
  listPostingStats,
  getPostingStats,
  getImpact,
} from "./university";
export { publishOpportunity } from "./publish";

// ---- student ------------------------------------------------------------
export {
  getStudentProfile,
  updateStudentProfile,
  addScheduleBlock,
  removeScheduleBlock,
  importScheduleIcs,
  getFeed,
  getPast,
  getPendingAttendance,
  setFeedback,
  setAttendance,
  listNotifications,
  markNotificationsRead,
} from "./student";

// ---- demo ---------------------------------------------------------------
export { getDemoCsv, resetDemo } from "./seed";
