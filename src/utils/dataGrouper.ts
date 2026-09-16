import type { BapData, Student } from '@/types';

export interface SessionGroup {
    key: string;
    items: BapData[];
    allStudents: Student[];
}

export const groupSessions = (data: BapData[]): SessionGroup[] => {
    const groups: SessionGroup[] = [];
    let currentGroup: SessionGroup | null = null;

    data.forEach((item) => {
        // Unique key to identify a "class" or "subject" group. Includes prodi
        // and semester so a shared course name on the same day never merges
        // two different classes.
        const key = `${item.mataKuliah}-${item.hari}-${item.tanggal}-${item.prodi}-${item.semester}-${item.golongan}`;

        if (currentGroup && currentGroup.key === key) {
            currentGroup.items.push(item);
            // Merge students (duplicates might exist if same student in multiple sessions, 
            // but usually we just want a unique list of *absent* students for the "remarks" section)
            // For now, let's just concatenate and we can filter unique later if needed for the summary
            currentGroup.allStudents = [...currentGroup.allStudents, ...item.students];
        } else {
            if (currentGroup) {
                groups.push(currentGroup);
            }
            currentGroup = {
                key,
                items: [item],
                allStudents: [...item.students]
            };
        }
    });

    if (currentGroup) {
        groups.push(currentGroup);
    }

    return groups;
};
