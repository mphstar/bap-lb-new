"use client";

import SettingsPage from "@/components/pages/SettingsPage";
import { useAppDataContext } from "@/context/AppDataContext";

export default function Page() {
  const {
    appData,
    updateActiveWeek,
    assessmentForms,
    setAssessmentForms,
    updateTemplate,
    updateWeeks,
    updateStudentMaster,
    userId
  } = useAppDataContext();

  const handleImportData = async (importedAppData: any, importedAssessmentForms: any) => {
    updateTemplate(importedAppData.scheduleTemplate);
    updateWeeks(importedAppData.weeks);
    updateActiveWeek(importedAppData.activeWeek || 1);
    updateStudentMaster(importedAppData.studentMaster || []);
    setAssessmentForms(importedAssessmentForms);

    // Save to PostgreSQL via unified weekly endpoint
    if (userId) {
      try {
        await fetch('/api/weekly', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(importedAppData)
        });
        await fetch('/api/assessment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(importedAssessmentForms)
        });
      } catch (err) {
        console.error('[Settings Page] Save imported data to API failed:', err);
      }
    }
  };

  return (
    <SettingsPage
      activeWeek={appData.activeWeek}
      onActiveWeekChange={updateActiveWeek}
      templateCount={appData.scheduleTemplate.length}
      weeksData={appData.weeks}
      appData={appData}
      assessmentForms={assessmentForms}
      onImportData={handleImportData}
    />
  );
}
