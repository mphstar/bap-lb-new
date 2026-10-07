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
        <div className="w-full bg-white text-black text-[12px] leading-normal print:text-[10px] print:leading-normal" style={{ fontFamily: "'Times New Roman', Times, serif" }}>
            <table className="w-full border-collapse border border-black table-auto">
                <thead>
                    <tr className="bg-gray-100 text-center font-bold">
                        <th className="border border-black px-1.5 py-1 w-[4%]">No</th>
                        <th className="border border-black px-2 py-1 text-left w-[20%]">Mata Kuliah</th>
                        <th className="border border-black px-2 py-1 text-left w-[15%]">Materi</th>
                        <th className="border border-black px-1 py-1 w-[6%]">Hari</th>
                        <th className="border border-black px-1.5 py-1 w-[11%]">Tanggal</th>
                        <th className="border border-black px-1 py-1 w-[8%]">Tempat</th>
                        <th className="border border-black px-1 py-1 w-[9%]">Jam</th>
                        <th className="border border-black px-1 py-1 w-[4%]">Prodi</th>
                        <th className="border border-black px-1 py-1 w-[4%]">Smtr</th>
                        <th className="border border-black px-1 py-1 w-[3%]">Gol</th>
                        <th className="border border-black px-2 py-1 text-left w-[12%]">Pengajar</th>
                        <th className="border border-black px-2 py-1 text-left w-[12%]">Teknisi</th>
                    </tr>
                </thead>
                {groups.map((group, groupIndex) => {
                    const absentStudents = getAbsentStudents(group.allStudents);

                    return (
                        <tbody key={`group-${groupIndex}-${group.key}`}>
                            {/* Add session rows */}
                            {group.items.map((item, itemIndex) => (
                                <tr key={`group-${groupIndex}-${group.key}-${itemIndex}`} className="print:break-inside-avoid">
                                    <td className="border border-black px-1.5 py-1 text-center whitespace-nowrap">{item.no}</td>
                                    <td className="border border-black px-2 py-1 whitespace-normal break-words text-left" title={item.mataKuliah}>{item.mataKuliah}</td>
                                    <td className="border border-black px-2 py-1 whitespace-normal break-words text-left">{item.materi || '-'}</td>
                                    <td className="border border-black px-1 py-1 text-center whitespace-nowrap">{item.hari}</td>
                                    <td className="border border-black px-1.5 py-1 text-center whitespace-nowrap">{item.tanggal}</td>
                                    <td className="border border-black px-1 py-1 text-center whitespace-normal break-words">{item.tempat}</td>
                                    <td className="border border-black px-1 py-1 text-center whitespace-nowrap">{item.jam}</td>
                                    <td className="border border-black px-1 py-1 text-center whitespace-nowrap">{item.prodi}</td>
                                    <td className="border border-black px-1 py-1 text-center whitespace-nowrap">{item.semester}</td>
                                    <td className="border border-black px-1 py-1 text-center whitespace-nowrap">{item.golongan}</td>
                                    <td className="border border-black px-2 py-1 whitespace-normal break-words text-left" title={item.pengajar}>{item.pengajar || '-'}</td>
                                    <td className="border border-black px-2 py-1 whitespace-normal break-words text-left" title={item.teknisi}>{item.teknisi || '-'}</td>
                                </tr>
                            ))}

                            {/* Absent List row */}
                            <tr key={`group-${groupIndex}-${group.key}-absent-header`} className="print:break-inside-avoid print:break-after-avoid">
                                <td colSpan={12} className="border border-black px-2 py-1 font-bold text-left bg-gray-50 text-[11px] print:text-[9.5px] uppercase tracking-wide">
                                    DAFTAR TIDAK HADIR (Nama, NIM, Keterangan)
                                </td>
                            </tr>
                            <tr key={`group-${groupIndex}-${group.key}-absent-body`} className="print:break-inside-avoid">
                                <td colSpan={12} className="border border-black px-2 py-1 text-left bg-green-50/50">
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-1">
                                        {absentStudents.length > 0 ? (
                                            absentStudents.map((s, idx) => (
                                                <span key={idx} className="whitespace-normal break-words text-slate-800 font-medium text-[11px] print:text-[9.5px] pr-1 leading-normal">
                                                    {idx + 1}. {s.name} ({s.nim}) - <span className="font-bold text-red-600 underline">{s.remarks}</span>
                                                </span>
                                            ))
                                        ) : (
                                            <span className="whitespace-nowrap text-slate-600 text-[11px] print:text-[9.5px]">-</span>
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
