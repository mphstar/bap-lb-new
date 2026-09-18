import React from 'react';
import type { BapData } from '@/types';

interface DaftarHadirDocumentProps {
    data: BapData;
    isLast?: boolean;
    showSignature?: boolean;
    dosenSignature?: string | null;
    teknisiSignature?: string | null;
    academicYear?: string;
    academicSemester?: string;
    paperSize?: 'a4' | 'f4';
}

const DaftarHadirDocument: React.FC<DaftarHadirDocumentProps> = ({
    data,
    isLast = false,
    showSignature = true,
    dosenSignature = null,
    teknisiSignature = null,
    academicYear = "2025/2026",
    academicSemester = "Genap",
    paperSize = 'a4'
}) => {
    // Filter students who have remarks (absent/special status)
    const absentStudents = data.students.filter(
        s => s.remarks && s.remarks.trim() !== '' && s.remarks.trim().toLowerCase() !== 'hadir'
    );

    const isF4 = paperSize === 'f4';
    const minSingleRows = isF4 ? 9 : 7;
    const minGridSlots = isF4 ? 18 : 14;

    // Calculate how many rows we need for the 2-column grid.
    // Minimum rows: 9 rows (18 slots) for F4, 7 rows (14 slots) for A4.
    const totalSlots = Math.max(minGridSlots, Math.ceil(absentStudents.length / 2) * 2);
    const numRows = totalSlots / 2;

    const semesterDisplay = (academicSemester || 'Genap').trim().toUpperCase();
    const yearDisplay = (academicYear || '2025/2026').trim();

    return (
        <div
            className={`bg-white text-black leading-snug mx-auto ${isF4 ? 'pt-[4mm] pb-[1mm]' : 'pt-[3mm] pb-[1mm]'} ${isLast ? '' : 'border-b-2 border-dashed border-gray-800'}`}
            style={{
                width: '100%',
                boxSizing: 'border-box',
                fontSize: '10pt',
                fontFamily: "'Times New Roman', Times, serif",
            }}
        >
            {/* Institutional Header - Smaller */}
            <div className={`${isF4 ? 'mb-2.5' : 'mb-1.5'} text-center`} style={{ fontSize: '9pt' }}>
                <p className="font-bold">KEMENTERIAN PENDIDIKAN TINGGI, SAINS, DAN TEKNOLOGI</p>
                <p className="font-bold">POLITEKNIK NEGERI JEMBER</p>
                <div className="border-b-[1.5px] border-black mt-1 mb-1 w-[90%] mx-auto"></div>
            </div>

            {/* Title - Smaller */}
            <div className={`${isF4 ? 'mb-2.5' : 'mb-1.5'} text-center`} style={{ fontSize: '9pt' }}>
                <p className="font-bold">DAFTAR HADIR PEMBIMBING PRAKTIKUM LABORATORIUM DAN LAPANG</p>
                <p className="font-bold">SEMESTER {semesterDisplay} TAHUN AKADEMIK {yearDisplay}</p>
            </div>

            {/* Session Details - Compact 2-column Grid */}
            <div className={`grid grid-cols-2 gap-x-8 ${isF4 ? 'mb-3' : 'mb-2'} ml-0 px-16 print:px-10`} style={{ width: '100%', fontSize: '9.5pt', lineHeight: '1.2' }}>
                {/* Left Column */}
                <div>
                    <table style={{ width: '100%', tableLayout: 'fixed' }}>
                        <tbody>
                            <tr>
                                <td style={{ width: '110px', paddingBottom: '2px', verticalAlign: 'top' }}>Mata kuliah</td>
                                <td style={{ width: '15px', textAlign: 'center', paddingBottom: '2px', verticalAlign: 'top' }}>:</td>
                                <td style={{ paddingBottom: '2px', verticalAlign: 'top' }}>{data.mataKuliah}</td>
                            </tr>
                            <tr>
                                <td style={{ width: '110px', paddingBottom: '2px', verticalAlign: 'top' }}>Hari / Tanggal</td>
                                <td style={{ width: '15px', textAlign: 'center', paddingBottom: '2px', verticalAlign: 'top' }}>:</td>
                                <td style={{ paddingBottom: '2px', verticalAlign: 'top' }}>{data.hari} / {data.tanggal}</td>
                            </tr>
                            <tr>
                                <td style={{ width: '110px', paddingBottom: '2px', verticalAlign: 'top' }}>Tempat</td>
                                <td style={{ width: '15px', textAlign: 'center', paddingBottom: '2px', verticalAlign: 'top' }}>:</td>
                                <td style={{ paddingBottom: '2px', verticalAlign: 'top' }}>{data.tempat}</td>
                            </tr>
                            <tr>
                                <td style={{ width: '110px', paddingBottom: '2px', verticalAlign: 'top' }}>Jam</td>
                                <td style={{ width: '15px', textAlign: 'center', paddingBottom: '2px', verticalAlign: 'top' }}>:</td>
                                <td style={{ paddingBottom: '2px', verticalAlign: 'top' }}>{data.jam}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                {/* Right Column */}
                <div>
                    <table style={{ width: '100%', tableLayout: 'fixed' }}>
                        <tbody>
                            <tr>
                                <td style={{ width: '110px', paddingBottom: '2px', verticalAlign: 'top' }}>Program Studi</td>
                                <td style={{ width: '15px', textAlign: 'center', paddingBottom: '2px', verticalAlign: 'top' }}>:</td>
                                <td style={{ paddingBottom: '2px', verticalAlign: 'top' }}>{data.prodi}</td>
                            </tr>
                            <tr>
                                <td style={{ width: '110px', paddingBottom: '2px', verticalAlign: 'top' }}>Semester / gol</td>
                                <td style={{ width: '15px', textAlign: 'center', paddingBottom: '2px', verticalAlign: 'top' }}>:</td>
                                <td style={{ paddingBottom: '2px', verticalAlign: 'top' }}>{data.semester} / {data.golongan}</td>
                            </tr>
                            <tr>
                                <td style={{ width: '110px', paddingBottom: '2px', verticalAlign: 'top' }}>Materi Praktikum</td>
                                <td style={{ width: '15px', textAlign: 'center', paddingBottom: '2px', verticalAlign: 'top' }}>:</td>
                                <td style={{ paddingBottom: '2px', verticalAlign: 'top' }}>{data.materi}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Pembimbing Table - Compact */}
            <table className={`w-[90%] mx-auto border-collapse border border-black ${isF4 ? 'mb-3' : 'mb-2'}`}>
                <thead>
                    <tr>
                        <th className="border border-black px-2 py-0.5 text-center font-normal" style={{ width: '40px', fontSize: '9pt' }}>NO</th>
                        <th className="border border-black px-2 py-0.5 text-center font-normal" style={{ fontSize: '9pt' }}>NAMA DOSEN / TEKNISI PEMBIMBING</th>
                        {showSignature && (
                            <th className="border border-black px-2 py-0.5 text-center font-normal" style={{ width: '200px', fontSize: '9pt' }}>TANDA TANGAN</th>
                        )}
                    </tr>
                </thead>
                <tbody style={{ fontSize: '10pt' }}>
                    <tr>
                        <td className="border border-black px-2 py-0.5 text-center">1.</td>
                        <td className="border border-black px-2 py-0.5">{data.pengajar}</td>
                        {showSignature && (
                            <td className="border border-black p-0 text-center" style={{ height: isF4 ? '38px' : '34px', verticalAlign: 'middle' }}>
                                <div className="relative flex items-center justify-center" style={{ height: isF4 ? '38px' : '34px' }}>
                                    {dosenSignature && (
                                        <img
                                            src={dosenSignature}
                                            alt="TTD Dosen"
                                            style={{
                                                position: 'absolute',
                                                maxHeight: isF4 ? '55px' : '50px',
                                                maxWidth: '180px',
                                                objectFit: 'contain',
                                                top: '50%',
                                                transform: 'translateY(-50%)',
                                                zIndex: 10
                                            }}
                                        />
                                    )}
                                </div>
                            </td>
                        )}
                    </tr>
                    <tr>
                        <td className="border border-black px-2 py-0.5 text-center">2.</td>
                        <td className="border border-black px-2 py-0.5">{data.teknisi}</td>
                        {showSignature && (
                            <td className="border border-black p-0 text-center" style={{ height: isF4 ? '38px' : '34px', verticalAlign: 'middle' }}>
                                <div className="relative flex items-center justify-center" style={{ height: isF4 ? '38px' : '34px' }}>
                                    {teknisiSignature && (
                                        <img
                                            src={teknisiSignature}
                                            alt="TTD Teknisi"
                                            style={{
                                                position: 'absolute',
                                                maxHeight: isF4 ? '55px' : '50px',
                                                maxWidth: '180px',
                                                objectFit: 'contain',
                                                top: '50%',
                                                transform: 'translateY(-50%)',
                                                zIndex: 10
                                            }}
                                        />
                                    )}
                                </div>
                            </td>
                        )}
                    </tr>
                </tbody>
            </table>

            {/* Absent Students Title */}
            <div className="text-center mb-1" style={{ fontSize: '10pt', fontWeight: 'bold' }}>
                DAFTAR MAHASISWA YANG TIDAK MENGIKUTI PRAKTEK
            </div>

            {/* Absent Students Table - Conditional Grid */}
            {absentStudents.length > (isF4 ? 9 : 7) ? (
                <table className="w-[98%] mx-auto border-collapse border border-black mb-2">
                    <thead>
                        <tr>
                            {/* Column 1 */}
                            <th className="border border-black px-1 py-0.5 text-center font-normal" style={{ width: '25px', fontSize: '8pt' }}>NO</th>
                            <th className="border border-black px-1 py-0.5 text-center font-normal" style={{ fontSize: '8pt' }}>NAMA MAHASISWA</th>
                            <th className="border border-black px-1 py-0.5 text-center font-normal" style={{ width: '80px', fontSize: '8pt' }}>NIM</th>
                            <th className="border border-black px-1 py-0.5 text-center font-normal border-r-2" style={{ width: '50px', fontSize: '8pt' }}>KET</th>

                            {/* Column 2 */}
                            <th className="border border-black px-1 py-0.5 text-center font-normal" style={{ width: '25px', fontSize: '8pt' }}>NO</th>
                            <th className="border border-black px-1 py-0.5 text-center font-normal" style={{ fontSize: '8pt' }}>NAMA MAHASISWA</th>
                            <th className="border border-black px-1 py-0.5 text-center font-normal" style={{ width: '80px', fontSize: '8pt' }}>NIM</th>
                            <th className="border border-black px-1 py-0.5 text-center font-normal" style={{ width: '50px', fontSize: '8pt' }}>KET</th>
                        </tr>
                    </thead>
                    <tbody style={{ fontSize: '9pt' }}>
                        {Array.from({ length: numRows }).map((_, rowIdx) => {
                            const idx1 = rowIdx;
                            const idx2 = rowIdx + numRows;
                            const s1 = absentStudents[idx1];
                            const s2 = absentStudents[idx2];

                            return (
                                <tr key={rowIdx}>
                                    {/* Left Column */}
                                    <td className="border border-black px-1 py-px text-center">{idx1 + 1}.</td>
                                    <td className="border border-black px-1 py-px truncate max-w-[120px]">{s1?.name || '\u00A0'}</td>
                                    <td className="border border-black px-1 py-px text-center">{s1?.nim || '\u00A0'}</td>
                                    <td className="border border-black px-1 py-px text-center truncate max-w-[50px] border-r-2">{s1?.remarks || '\u00A0'}</td>

                                    {/* Right Column */}
                                    <td className={`border border-black px-1 py-px text-center ${!s2 && idx2 >= absentStudents.length ? 'text-transparent' : ''}`}>{idx2 + 1}.</td>
                                    <td className="border border-black px-1 py-px truncate max-w-[120px]">{s2?.name || '\u00A0'}</td>
                                    <td className="border border-black px-1 py-px text-center">{s2?.nim || '\u00A0'}</td>
                                    <td className="border border-black px-1 py-px text-center truncate max-w-[50px]">{s2?.remarks || '\u00A0'}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            ) : (
                <table className="w-[90%] mx-auto border-collapse border border-black mb-2">
                    <thead>
                        <tr>
                            <th className="border border-black px-2 py-0.5 text-center font-normal" style={{ width: '40px', fontSize: '9pt' }}>NO</th>
                            <th className="border border-black px-2 py-0.5 text-center font-normal" style={{ fontSize: '9pt' }}>NAMA MAHASISWA</th>
                            <th className="border border-black px-2 py-0.5 text-center font-normal" style={{ width: '120px', fontSize: '9pt' }}>NIM</th>
                            <th className="border border-black px-2 py-0.5 text-center font-normal" style={{ width: '100px', fontSize: '9pt' }}>KET</th>
                        </tr>
                    </thead>
                    <tbody style={{ fontSize: '10pt' }}>
                        {absentStudents.length > 0 ? (
                            <>
                                {absentStudents.map((student, idx) => (
                                    <tr key={idx}>
                                        <td className="border border-black px-2 py-px text-center">{idx + 1}.</td>
                                        <td className="border border-black px-2 py-px truncate max-w-[200px]">{student.name}</td>
                                        <td className="border border-black px-2 py-px text-center">{student.nim}</td>
                                        <td className="border border-black px-2 py-px text-center truncate max-w-[80px]">{student.remarks}</td>
                                    </tr>
                                ))}
                                {/* Pad to exactly minSingleRows */}
                                {Array.from({ length: Math.max(0, minSingleRows - absentStudents.length) }).map((_, idx) => (
                                    <tr key={`empty-${idx}`}>
                                        <td className="border border-black px-2 py-px text-center text-transparent">{absentStudents.length + idx + 1}.</td>
                                        <td className="border border-black px-2 py-px">&nbsp;</td>
                                        <td className="border border-black px-2 py-px">&nbsp;</td>
                                        <td className="border border-black px-2 py-px">&nbsp;</td>
                                    </tr>
                                ))}
                            </>
                        ) : (
                            Array.from({ length: minSingleRows }).map((_, idx) => (
                                <tr key={`empty-${idx}`}>
                                    <td className="border border-black px-2 py-px text-center text-transparent">{idx + 1}.</td>
                                    <td className="border border-black px-2 py-px">&nbsp;</td>
                                    <td className="border border-black px-2 py-px">&nbsp;</td>
                                    <td className="border border-black px-2 py-px">&nbsp;</td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            )}
        </div>
    );
};

export default DaftarHadirDocument;
