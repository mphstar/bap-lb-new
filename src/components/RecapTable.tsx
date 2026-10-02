import React from 'react';
import type { Student } from '@/types';
import type { SessionGroup } from '@/utils/dataGrouper';

interface RecapTableProps {
    groups: SessionGroup[];
}

const RecapTable: React.FC<RecapTableProps> = ({ groups }) => {
    // Helper to extract unique absent students
    const getAbsentStudents = (students: Student[]) => {
        const uniqueMap = new Map();
        (students || []).forEach(s => {
            if (!s.remarks || s.remarks.trim().toLowerCase() !== 'hadir') {
                if (!uniqueMap.has(s.nim)) {
                    uniqueMap.set(s.nim, {
                        ...s,
                        remarks: s.remarks && s.remarks.trim() !== '' ? s.remarks : 'ALPHA'
                    });
                }
            }
        });
        return Array.from(uniqueMap.values()).sort((a, b) => 
            (a.name || '').localeCompare(b.name || '', 'id') ||
            (a.nim || '').localeCompare(b.nim || '', undefined, { numeric: true })
        );
    };

    return (
        <div className="w-full bg-white text-black text-[12px] leading-tight print:text-[11px]" style={{ fontFamily: "'Times New Roman', Times, serif" }}>
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
                {groups.map((group, groupIndex) => {
                    const absentStudents = getAbsentStudents(group.allStudents);

                    return (
                        <tbody key={`group-${groupIndex}-${group.key}`}>
                            {/* Add session rows */}
                            {group.items.map((item, itemIndex) => (
                                <tr key={`group-${groupIndex}-${group.key}-${itemIndex}`}>
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
                            ))}

                            {/* Absent List row */}
                            <tr key={`group-${groupIndex}-${group.key}-absent-header`} className="print:break-inside-avoid print:break-after-avoid">
                                <td colSpan={12} className="border border-black border-b-0 p-1 font-bold text-left bg-gray-50 text-[12px] print:text-[11px] uppercase tracking-wider">
                                    DAFTAR TIDAK HADIR (Nama, NIM, Keterangan)
                                </td>
                            </tr>
                            <tr key={`group-${groupIndex}-${group.key}-absent-body`} className="print:break-inside-avoid">
                                <td colSpan={12} className="border border-black border-t-0 p-1 text-left bg-green-100">
                                    <div className="grid grid-cols-3 gap-x-4 gap-y-1">
                                        {absentStudents.length > 0 ? (
                                            absentStudents.map((s, idx) => (
                                                <span key={idx} className="whitespace-normal break-words text-green-900 font-medium text-[12px] print:text-[11px] pr-2">
                                                    {idx + 1}. {s.name} ({s.nim}) - <span className="font-bold text-red-600 border-b border-red-600">{s.remarks}</span>
                                                </span>
                                            ))
                                        ) : (
                                            <span className="whitespace-nowrap text-green-900 font-medium text-[12px] print:text-[11px]">-</span>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        </tbody>
                    );
                })}
            </table>
        </div>
    );
};

export default RecapTable;
