import React from 'react';
import type { Student } from '@/types';
import type { SessionGroup } from '@/utils/dataGrouper';

interface RecapTableProps {
    groups: SessionGroup[];
}

const RecapTable: React.FC<RecapTableProps> = ({ groups }) => {
    // Helper to extract unique absent students
    const getAbsentStudents = (students: Student[]) => {
        // Assuming "remarks" being non-empty means absent or special status
        // Or we filter by specific keywords if needed, but for now just non-empty remarks
        // Also remove duplicates based on NIM
        const uniqueMap = new Map();
        students.forEach(s => {
            if (s.remarks && s.remarks.trim() !== "") {
                if (!uniqueMap.has(s.nim)) {
                    uniqueMap.set(s.nim, s);
                }
            }
        });
        return Array.from(uniqueMap.values());
    };

    return (
        <div className="w-full bg-white text-black text-[12px] leading-tight" style={{ fontFamily: "'Times New Roman', Times, serif" }}>
            <table className="w-full border-collapse border border-black table-auto">
                <thead>
                    <tr className="bg-gray-100 text-center font-bold">
                        <th className="border border-black p-1 w-8">No</th>
                        <th className="border border-black p-1 w-72">Mata Kuliah</th>
                        <th className="border border-black p-1 w-24">Materi</th>
                        <th className="border border-black p-1 w-16">Hari</th>
                        <th className="border border-black p-1 w-24">Tanggal</th>
                        <th className="border border-black p-1 w-12">Tempat</th>
                        <th className="border border-black p-1 w-24">Jam</th>
                        <th className="border border-black p-1 w-12">Prodi</th>
                        <th className="border border-black p-1 w-12">Semester</th>
                        <th className="border border-black p-1 w-12">Golongan</th>
                        <th className="border border-black p-1 w-48">Pengajar</th>
                        <th className="border border-black p-1 w-48">Teknisi</th>
                    </tr>
                </thead>
                <tbody>
                    {groups.flatMap((group, groupIndex) => {
                        const absentStudents = getAbsentStudents(group.allStudents);
                        const rows: React.ReactNode[] = [];

                        // Add session rows
                        group.items.forEach((item, itemIndex) => {
                            rows.push(
                                <tr key={`group-${groupIndex}-${group.key}-${itemIndex}`}>
                                    {/* 
                      Actually, let's just render the item.no if it exists in excel, 
                      otherwise we might need to re-index. 
                      The parsing logic mapped 'No' from excel.
                   */}
                                    <td className="border border-black p-1 min-w-[30px] text-center whitespace-nowrap">{item.no}</td>
                                    <td className="border border-black p-1 min-w-[100px] max-w-[180px] whitespace-normal break-words align-center" title={item.mataKuliah}>{item.mataKuliah}</td>
                                    <td className="border border-black p-1 min-w-[80px] max-w-[120px] whitespace-normal break-words align-center">{item.materi}</td>
                                    <td className="border border-black p-1 text-center whitespace-nowrap">{item.hari}</td>
                                    <td className="border border-black p-1 text-center whitespace-nowrap">{item.tanggal}</td>
                                    <td className="border border-black p-1 text-center whitespace-nowrap">{item.tempat}</td>
                                    <td className="border border-black p-1 text-center whitespace-nowrap">{item.jam}</td>
                                    <td className="border border-black p-1 text-center whitespace-nowrap">{item.prodi}</td>
                                    <td className="border border-black p-1 text-center whitespace-nowrap">{item.semester}</td>
                                    <td className="border border-black p-1 text-center whitespace-nowrap">{item.golongan}</td>
                                    <td className="border border-black p-1 min-w-[80px] max-w-[120px] whitespace-normal break-words align-center" title={item.pengajar}>{item.pengajar}</td>
                                    <td className="border border-black p-1 min-w-[80px] max-w-[120px] whitespace-normal break-words align-center" title={item.teknisi}>{item.teknisi}</td>
                                </tr>
                            );
                        });

                        // Always show Absent List row
                        // Header for absent list
                        rows.push(
                            <tr key={`group-${groupIndex}-${group.key}-absent-header`}>
                                <td colSpan={12} className="border border-black border-b-0 p-1 font-bold text-left bg-gray-50 text-[12px] uppercase tracking-wider">
                                    DAFTAR TIDAK HADIR (Nama, NIM, Keterangan)
                                </td>
                            </tr>
                        );

                        // Combined absent row
                        rows.push(
                            <tr key={`group-${groupIndex}-${group.key}-absent-body`}>
                                <td colSpan={12} className="border border-black border-t-0 p-1 text-left bg-green-100">
                                    <div className="grid grid-cols-3 gap-x-4 gap-y-1">
                                        {absentStudents.length > 0 ? (
                                            absentStudents.map((s, idx) => (
                                                <span key={idx} className="whitespace-normal break-words text-green-900 font-medium text-[12px] pr-2">
                                                    {idx + 1}. {s.name} ({s.nim}) - <span className="font-bold text-red-600 border-b border-red-600">{s.remarks}</span>
                                                </span>
                                            ))
                                        ) : (
                                            <span className="whitespace-nowrap text-green-900 font-medium text-[12px]">-</span>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        );

                        return rows;
                    })}
                </tbody>
            </table>
        </div>
    );
};

export default RecapTable;
