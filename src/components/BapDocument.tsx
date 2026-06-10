import React from 'react';
import type { BapData } from '@/types';

interface BapDocumentProps {
    data: BapData;
}

const BapDocument: React.FC<BapDocumentProps> = ({ data }) => {
    return (
        <div className="w-[297mm] bg-white text-black p-4 mx-auto print:mx-0 print:p-4 print:w-full box-border relative text-[15px] mb-8 border-b-2 border-dashed border-gray-300 print:mb-4 print:border-gray-800" style={{ fontFamily: "'Times New Roman', Times, serif" }}>

            {/* Compact Header Section */}
            <div className="mb-4 text-[13px]">
                <table className="w-full mb-2">
                    <tbody>
                        <tr>
                            <td className="font-bold w-24">Mata Kuliah</td>
                            <td className="w-64">: {data.mataKuliah}</td>
                            <td className="font-bold w-16">Hari/Tgl</td>
                            <td className="w-48">: {data.hari}, {data.tanggal}</td>
                            <td className="font-bold w-16">Jam/Rng</td>
                            <td>: {data.jam} / {data.tempat}</td>
                        </tr>
                        <tr>
                            <td className="font-bold">Dosen</td>
                            <td>: {data.pengajar}</td>
                            <td className="font-bold">Prodi/Sem</td>
                            <td>: {data.prodi} / {data.semester}</td>
                            <td className="font-bold">Materi</td>
                            <td>: {data.materi}</td>
                        </tr>
                    </tbody>
                </table>
            </div>

            {/* Student Table */}
            <table className="w-full border-collapse border border-black mb-2 text-[13px]">
                <thead>
                    <tr className="bg-gray-100 text-center">
                        <th className="border border-black p-1 w-8">No</th>
                        <th className="border border-black p-1 w-24">NIM</th>
                        <th className="border border-black p-1 bg-yellow-100">Nama Mahasiswa</th>
                        <th className="border border-black p-1 w-16">Ket.</th>
                        {/* Time Slot Columns */}
                        <th className="border border-black p-1 w-16">7.00-9.00</th>
                        <th className="border border-black p-1 w-16">9.00-11.00</th>
                        <th className="border border-black p-1 w-16">13.00-15.00</th>
                        <th className="border border-black p-1 w-16">15.00-17.00</th>
                    </tr>
                </thead>
                <tbody>
                    {data.students.map((student, index) => (
                        <tr key={index}>
                            <td className="border border-black p-1 text-center">{index + 1}</td>
                            <td className="border border-black p-1 text-center">{student.nim}</td>
                            <td className="border border-black p-1 font-medium">{student.name}</td>
                            <td className="border border-black p-1 text-center">{student.remarks}</td>
                            <td className="border border-black p-1"></td>
                            <td className="border border-black p-1"></td>
                            <td className="border border-black p-1"></td>
                            <td className="border border-black p-1"></td>
                        </tr>
                    ))}
                </tbody>
            </table>

            {/* Footer Signatures */}
            <div className="flex justify-end pr-8">
                <div className="text-center text-[13px]">
                    <span className="font-bold underline">{data.pengajar}</span>
                </div>
            </div>

        </div>
    );
};

export default BapDocument;
