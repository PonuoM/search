

import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { writeAnalysisToSheet } from '../services/googleSheetsService';
import type { AnalysisResult, TranscribedUtterance, CallMetadata, SalespersonEvaluation, CustomerEvaluation, SituationalEvaluation, StrategicRecommendationItem, CustomerHistoryRecord } from '../types';
import { TableCellsIcon } from './icons/TableCellsIcon'; 
import { UserCircleIcon } from './icons/UserCircleIcon';
import { ClipboardIcon } from './icons/ClipboardIcon';
import { LightBulbIcon } from './icons/LightBulbIcon';
import { ChartBarIcon } from './icons/ChartBarIcon';
import { CheckCircleIcon } from './icons/CheckCircleIcon';
import { XCircleIcon } from './icons/XCircleIcon';
import { TargetIcon } from './icons/TargetIcon';
import { DocumentDownloadIcon } from './icons/DocumentDownloadIcon';
import { PdfReport } from './PdfReport';
import { SaveIcon } from './icons/SaveIcon';


interface ResultsDisplayProps {
  result: AnalysisResult;
  callMetadata: CallMetadata | null;
  salespersonName: string | null;
  relevantHistory?: CustomerHistoryRecord[] | null;
  isLoggedIn: boolean;
  googleSheetId: string;
}

const SectionCard: React.FC<{ title: string; icon?: React.ReactNode; children: React.ReactNode; }> = ({ title, icon, children }) => (
  <div className="bg-white/50 dark:bg-black/20 backdrop-blur-xl p-4 sm:p-6 rounded-2xl shadow-lg border border-slate-200 dark:border-white/10">
    <h3 className="text-xl font-semibold mb-4 flex items-center text-sky-600 dark:text-sky-400">
      {icon && <span className="mr-3 h-6 w-6">{icon}</span>}
      {title}
    </h3>
    <div className="space-y-4">
        {children}
    </div>
  </div>
);

const ProgressBar: React.FC<{ value: number; max?: number; label: string; }> = ({ value, max = 10, label }) => {
    const percentage = (value / max) * 100;
    const colorClass = percentage > 70 ? 'bg-green-500' : percentage > 40 ? 'bg-yellow-500' : 'bg-red-500';
    return (
        <div>
            <div className="flex justify-between mb-1">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{label}</span>
                <span className="text-sm font-medium text-slate-800 dark:text-slate-200">{value} / {max}</span>
            </div>
            <div className="w-full bg-slate-200/70 dark:bg-slate-700/50 rounded-full h-2.5">
                <div className={`${colorClass} h-2.5 rounded-full transition-all duration-500 ease-out`} style={{ width: `${percentage}%` }}></div>
            </div>
        </div>
    );
};

const ValueDisplay: React.FC<{ label: string; value: string | number | undefined; className?: string }> = ({ label, value, className }) => (
  <div className={`text-sm text-slate-600 dark:text-slate-400 ${className}`}>
    <strong className="text-slate-800 dark:text-slate-200 font-medium">{label}:</strong> {value ?? 'N/A'}
  </div>
);

const BulletList: React.FC<{ items: string[] | undefined; icon: React.ReactNode; className?: string; title?: string }> = ({ items, icon, className = 'text-green-500 dark:text-green-400', title }) => (
    <div>
        {title && <h4 className="font-semibold text-slate-800 dark:text-slate-200 mb-2">{title}</h4>}
        <ul className="list-none p-0 space-y-2">
            {(items && items.length > 0) ? items.map((item, index) => (
                <li key={index} className="flex items-start">
                    <span className={`h-5 w-5 mr-2 mt-0.5 shrink-0 ${className}`}>{icon}</span>
                    <span className="text-slate-700 dark:text-slate-300">{item}</span>
                </li>
            )) : <li className="text-slate-500 dark:text-slate-500 italic ml-7">ไม่มีข้อมูล</li>}
        </ul>
    </div>
);

const PhoneIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" {...props}>
        <path fillRule="evenodd" d="M2 3.5A1.5 1.5 0 0 1 3.5 2h1.148a1.5 1.5 0 0 1 1.465 1.175l.716 3.003a1.5 1.5 0 0 1-2.45 1.772l-.336-.297a11.026 11.026 0 0 0-3.21.323 1.5 1.5 0 0 1-.62.296l-1.12.503A1.5 1.5 0 0 1 2 9.172V5.513a1.5 1.5 0 0 1 0-1.002V3.5zm16.5-2.032a1.5 1.5 0 0 0-1.5 1.5v1.011c0 .338.036.67.106.99l-1.12.503a1.5 1.5 0 0 0-.62.296c-1.102-.19-2.18-.313-3.21-.323l-.336-.297a1.5 1.5 0 0 0-2.45 1.772l.716 3.003A1.5 1.5 0 0 0 8.852 18h2.296a1.5 1.5 0 0 0 1.465-1.175l.716-3.003a1.5 1.5 0 0 0-2.45-1.772l-.336.297c1.102.19 2.18.313 3.21.323l.336.297a1.5 1.5 0 0 0 2.45-1.772l-.716-3.003a1.5 1.5 0 0 0-1.447-1.296z" clipRule="evenodd" />
    </svg>
);


export const ResultsDisplay: React.FC<ResultsDisplayProps> = ({ result, callMetadata, salespersonName, relevantHistory, isLoggedIn, googleSheetId }) => {
  const [copyButtonText, setCopyButtonText] = useState<string>('คัดลอก CSV');
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  
  const { salespersonEvaluation, customerEvaluation, situationalEvaluation, strategicRecommendations, transcribedText } = result;
  
  const displayedSalespersonName = salespersonName ?? (callMetadata ? 'ไม่พบชื่อ' : null);

  const escapeCsvCell = (value: any): string => {
    if (value === null || value === undefined) return '';
    const stringValue = String(value).replace(/"/g, '""');
    return `"${stringValue}"`;
  };

  const handleCopyToCsv = async () => {
    const headers = [
      "วันที่โทร", "เวลาโทร", "ประเภทสาย", "เบอร์ต้นทาง", "เบอร์ปลายทาง", "พนักงานขาย",
      "SP Perf Score (%)", "SP Strengths", "SP Areas for Improvement",
      "Cust Interest (1-10)", "Cust Profile", "Cust Pain Points", "Cust Sentiment", "Purchasing Behavior",
      "Closing Probability (%)", "Call Sentiment", "Sales Stage", "Call Outcome", "Positive Signals", "Negative Signals",
      "Next Best Action", "Suggested Offer", "Detailed Strategy", "Transcribed Text"
    ];
    
    const formatStrategy = (items: StrategicRecommendationItem[]) => items.map(i => `${i.recommendation} (Success: ${i.successProbability}%)`).join('; ');
    const formatTranscription = (text?: TranscribedUtterance[] | null) => text?.map(t => `[${t.timestamp || 'N/A'}] ${t.speaker}: ${t.utterance}`).join('; ') || '';
    const formatPurchasingBehavior = (behavior?: typeof customerEvaluation.purchasingBehavior) => {
        if (!behavior) return '';
        return `Summary: ${behavior.summary}; Freq: ${behavior.buyingFrequency}; Volume: ${behavior.typicalPurchaseVolume}; Price Sensitivity: ${behavior.priceSensitivity}`;
    };

    const rowData = [
      callMetadata?.date, callMetadata?.time, callMetadata?.callType, callMetadata?.sourcePhone, callMetadata?.destinationPhone, displayedSalespersonName,
      salespersonEvaluation.overallPerformanceScore, salespersonEvaluation.strengths.join('; '), salespersonEvaluation.areasForImprovement.join('; '),
      customerEvaluation.interestLevel, customerEvaluation.customerProfile, customerEvaluation.painPointsIdentified.join('; '), customerEvaluation.customerSentiment, formatPurchasingBehavior(customerEvaluation.purchasingBehavior),
      situationalEvaluation.closingProbability, situationalEvaluation.callSentiment, situationalEvaluation.currentSalesStage, situationalEvaluation.callOutcomeSummary, situationalEvaluation.positiveSignals.join('; '), situationalEvaluation.negativeSignals.join('; '),
      strategicRecommendations.nextBestAction, strategicRecommendations.suggestedOffer, formatStrategy(strategicRecommendations.detailedStrategy), formatTranscription(transcribedText)
    ];

    const csvContent = [headers.join(','), rowData.map(escapeCsvCell).join(',')].join('\n');

    try {
      await navigator.clipboard.writeText(csvContent);
      setCopyButtonText('คัดลอกแล้ว!');
      setTimeout(() => setCopyButtonText('คัดลอก CSV'), 2000);
    } catch (err) {
      setCopyButtonText('คัดลอกไม่สำเร็จ');
      setTimeout(() => setCopyButtonText('คัดลอก CSV'), 3000);
    }
  };

  const handleSaveToSheet = async () => {
    if (!googleSheetId) {
        alert("กรุณาใส่ Google Sheet ID ก่อน");
        return;
    }
    setSaveStatus('saving');
    try {
      const customerPhone = callMetadata?.callType === 'โทรออก' ? callMetadata.destinationPhone : callMetadata?.sourcePhone;
      await writeAnalysisToSheet(googleSheetId, result, displayedSalespersonName, customerPhone);
      setSaveStatus('saved');
    } catch (error) {
      console.error("Failed to save to sheet:", error);
      setSaveStatus('error');
    }
  };

  const handleExportPdf = async () => {
    setIsGeneratingPdf(true);

    const reportElement = document.createElement('div');
    reportElement.style.position = 'fixed';
    reportElement.style.left = '0';
    reportElement.style.top = '0';
    reportElement.style.zIndex = '-1';
    reportElement.style.opacity = '0';
    
    const pdfContainer = document.createElement('div');
    reportElement.appendChild(pdfContainer);
    document.body.appendChild(reportElement);

    const root = ReactDOM.createRoot(pdfContainer);

    try {
      await new Promise<void>(resolve => {
        root.render(
            <PdfReport
                result={result}
                callMetadata={callMetadata}
                salespersonName={displayedSalespersonName}
                onRendered={resolve}
            />
        );
      });

      const canvas = await html2canvas(pdfContainer, {
          scale: 2.5,
          useCORS: true,
          logging: false,
          backgroundColor: '#ffffff',
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      
      const imgProps = pdf.getImageProperties(imgData);
      const imgRatio = imgProps.width / imgProps.height;
      
      let finalWidth = pdfWidth;
      let finalHeight = pdfWidth / imgRatio;

      if (finalHeight > pdfHeight) {
          finalHeight = pdfHeight;
          finalWidth = pdfHeight * imgRatio;
      }
      
      const x = (pdfWidth - finalWidth) / 2;
      const y = (pdfHeight - finalHeight) / 2;

      pdf.addImage(imgData, 'PNG', x, y, finalWidth, finalHeight);

      const filename = callMetadata?.originalFilename
          ? `Analysis_Report_${callMetadata.originalFilename.split('.')[0]}.pdf`
          : 'Analysis_Report.pdf';
      pdf.save(filename);

    } catch (err) {
        console.error("Failed to generate PDF", err);
    } finally {
        root.unmount();
        document.body.removeChild(reportElement);
        setIsGeneratingPdf(false);
    }
  };
  
  const getSaveButtonContent = () => {
    switch(saveStatus) {
        case 'saving': return 'กำลังบันทึก...';
        case 'saved': return 'บันทึกแล้ว!';
        case 'error': return 'บันทึกไม่สำเร็จ';
        default: return 'บันทึกลง Sheet';
    }
  };


  const renderTranscribedText = (textData: TranscribedUtterance[] | null | undefined) => (
    <div className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap space-y-2 max-h-72 overflow-y-auto bg-black/5 dark:bg-black/20 p-3 rounded-lg border border-slate-200 dark:border-white/10 pr-2">
      {(textData && textData.length > 0) ? textData.map((item, index) => (
        <div key={index} className="flex flex-col sm:flex-row sm:items-start">
          {item.timestamp && <span className="text-xs text-slate-500 dark:text-slate-500 w-full sm:w-24 shrink-0 mb-0.5 sm:mb-0 sm:mr-2 text-left sm:text-right">[{item.timestamp}]</span>}
          <p className={`flex-grow ${!item.timestamp ? 'sm:pl-0' : ''}`}>
            <strong className="text-sky-600 dark:text-sky-400">{item.speaker || 'ไม่ระบุ'}:</strong> {item.utterance}
          </p>
        </div>
      )) : <p className="text-slate-500 dark:text-slate-400 italic">ไม่มีข้อมูลการถอดเสียง</p>}
    </div>
  );

  return (
    <div className="mt-8 space-y-6 animate-fadeIn">
      <div className="flex justify-end gap-2 sm:gap-4 flex-wrap">
        <button 
          onClick={handleSaveToSheet} 
          disabled={!isLoggedIn || saveStatus === 'saving' || saveStatus === 'saved'}
          title={!isLoggedIn ? 'กรุณาลงชื่อเข้าใช้ด้วย Google เพื่อบันทึก' : 'บันทึกผลการวิเคราะห์ลง Google Sheet'}
          className={`font-semibold py-2 px-4 rounded-lg shadow-md hover:shadow-lg transition-all duration-150 flex items-center border
            ${saveStatus === 'saved' ? 'bg-green-500/20 text-green-700 dark:text-green-200 border-green-500/30' : ''}
            ${saveStatus === 'error' ? 'bg-red-500/20 text-red-700 dark:text-red-200 border-red-500/30' : ''}
            ${saveStatus === 'idle' || saveStatus === 'saving' ? 'bg-green-500/20 hover:bg-green-500/30 text-green-700 dark:bg-green-600/20 dark:hover:bg-green-600/30 dark:text-green-200 border-green-500/30 hover:border-green-500/40' : ''}
            disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          <SaveIcon className="h-5 w-5 mr-2" />
          {getSaveButtonContent()}
        </button>
        <button onClick={handleCopyToCsv} className="bg-slate-200/60 hover:bg-slate-300/60 text-slate-700 dark:bg-white/10 dark:hover:bg-white/20 dark:text-slate-100 font-semibold py-2 px-4 rounded-lg shadow-md hover:shadow-lg transition-all duration-150 flex items-center border border-slate-300/80 dark:border-white/20 hover:border-slate-400/80 dark:hover:border-white/30">
          <TableCellsIcon className="h-5 w-5 mr-2" />
          {copyButtonText}
        </button>
        <button
          onClick={handleExportPdf}
          disabled={isGeneratingPdf}
          className="bg-sky-500/20 hover:bg-sky-500/30 text-sky-700 dark:bg-sky-600/20 dark:hover:bg-sky-600/30 dark:text-sky-200 font-semibold py-2 px-4 rounded-lg shadow-md hover:shadow-lg transition-all duration-150 flex items-center border border-sky-500/30 hover:border-sky-500/40 disabled:opacity-50 disabled:cursor-wait"
        >
          <DocumentDownloadIcon className="h-5 w-5 mr-2" />
          {isGeneratingPdf ? 'กำลังสร้าง PDF...' : 'ส่งออกเป็น PDF'}
        </button>
      </div>

      {callMetadata && (
        <SectionCard title="รายละเอียดการโทร" icon={<PhoneIcon className="h-6 w-6" />}>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-2 text-sm">
                <ValueDisplay label="วันที่" value={callMetadata.date} />
                <ValueDisplay label="เวลา" value={callMetadata.time} />
                <ValueDisplay label="ประเภท" value={callMetadata.callType} />
                <ValueDisplay label="เบอร์ต้นทาง" value={callMetadata.sourcePhone} />
                <ValueDisplay label="เบอร์ปลายทาง" value={callMetadata.destinationPhone} />
                <ValueDisplay label="พนักงานขาย" value={displayedSalespersonName} />
            </div>
        </SectionCard>
      )}

      {/* Main Analysis Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <SectionCard title="ประเมินสถานการณ์" icon={<ChartBarIcon />}>
              <div className="text-center mb-4">
                  <p className="text-5xl font-bold text-sky-600 dark:text-sky-300">{situationalEvaluation.closingProbability}%</p>
                  <p className="text-slate-700 dark:text-slate-300">โอกาสในการปิดการขาย</p>
              </div>
              <ValueDisplay label="บรรยากาศการสนทนา" value={situationalEvaluation.callSentiment} />
              <ValueDisplay label="ขั้นตอนการขายปัจจุบัน" value={situationalEvaluation.currentSalesStage} />
              <ValueDisplay label="สรุปผลลัพธ์การโทร" value={situationalEvaluation.callOutcomeSummary} />
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-slate-200 dark:border-white/10 mt-4">
                    <BulletList items={situationalEvaluation.positiveSignals} icon={<CheckCircleIcon />} className="text-green-600 dark:text-green-400" title="สัญญาณเชิงบวก" />
                    <BulletList items={situationalEvaluation.negativeSignals} icon={<XCircleIcon />} className="text-red-600 dark:text-red-400" title="สัญญาณเชิงลบ" />
               </div>
          </SectionCard>
          <SectionCard title="ประเมินพนักงานขาย" icon={<UserCircleIcon />}>
              <ProgressBar value={salespersonEvaluation.overallPerformanceScore} max={100} label="คะแนนประสิทธิภาพโดยรวม" />
              <ProgressBar value={salespersonEvaluation.productKnowledgeScore} label="ความรู้ในผลิตภัณฑ์" />
              <ProgressBar value={salespersonEvaluation.closingSkillScore} label="ทักษะการปิดการขาย" />
              <ValueDisplay label="สไตล์การสื่อสาร" value={salespersonEvaluation.communicationStyle} className="mt-4" />
          </SectionCard>
      </div>
      
      <SectionCard title="ประเมินลูกค้า" icon={<UserCircleIcon className="text-teal-500 dark:text-teal-400" />}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
              <div>
                  <h4 className="font-semibold text-slate-800 dark:text-slate-200 mb-2">โปรไฟล์และ Sentiment</h4>
                  <ProgressBar value={customerEvaluation.interestLevel} label="ระดับความสนใจ" />
                  <ValueDisplay label="โปรไฟล์ลูกค้า" value={customerEvaluation.customerProfile} className="mt-4" />
                  <ValueDisplay label="ความรู้สึกของลูกค้า" value={customerEvaluation.customerSentiment} />
              </div>
              <div>
                  <BulletList items={customerEvaluation.painPointsIdentified} icon={<XCircleIcon />} className="text-red-600 dark:text-red-400" title="Pain Points ที่ระบุได้" />
                  <div className='mt-4'>
                    <BulletList items={customerEvaluation.decisionMakingFactors} icon={<CheckCircleIcon />} className="text-green-600 dark:text-green-400" title="ปัจจัยในการตัดสินใจ"/>
                  </div>
              </div>
               {customerEvaluation.purchasingBehavior && (
                <div className="md:col-span-2 mt-4 pt-4 border-t border-slate-200 dark:border-white/10 space-y-2">
                    <h4 className="font-semibold text-slate-800 dark:text-slate-200 mb-2">พฤติกรรมการซื้อ (จากประวัติ)</h4>
                    <ValueDisplay label="สรุปการซื้อ" value={customerEvaluation.purchasingBehavior.summary} />
                    <ValueDisplay label="ความถี่ในการซื้อ" value={customerEvaluation.purchasingBehavior.buyingFrequency} />
                    <ValueDisplay label="ปริมาณการซื้อปกติ" value={customerEvaluation.purchasingBehavior.typicalPurchaseVolume} />
                    <ValueDisplay label="ความอ่อนไหวต่อราคา" value={customerEvaluation.purchasingBehavior.priceSensitivity} />
                </div>
              )}
          </div>

          {relevantHistory && relevantHistory.length > 0 && (
            <div className="mt-4 pt-4 border-t border-slate-200 dark:border-white/10">
              <h4 className="font-semibold text-slate-800 dark:text-slate-200 mb-3">ประวัติการซื้อโดยละเอียด</h4>
              <div className="overflow-x-auto max-h-64 bg-black/5 dark:bg-black/20 rounded-lg border border-slate-200 dark:border-white/10">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-200/60 dark:bg-white/5 text-slate-700 dark:text-slate-300 sticky top-0 backdrop-blur-sm">
                    <tr>
                      <th className="px-4 py-2">วันที่ขาย</th>
                      <th className="px-4 py-2">สินค้า</th>
                      <th className="px-4 py-2">ชื่อผู้รับ</th>
                      <th className="px-4 py-2">ที่อยู่</th>
                      <th className="px-4 py-2">จังหวัด</th>
                      <th className="px-4 py-2 text-right">จำนวน</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-white/10">
                    {relevantHistory.map((item, index) => (
                      <tr key={index} className="hover:bg-slate-200/40 dark:hover:bg-white/5">
                        <td className="px-4 py-2 whitespace-nowrap">{item.date || '-'}</td>
                        <td className="px-4 py-2">{item.product || '-'}</td>
                        <td className="px-4 py-2">{item.recipientName || '-'}</td>
                        <td className="px-4 py-2 truncate max-w-xs">{item.address || '-'}</td>
                        <td className="px-4 py-2">{item.province || '-'}</td>
                        <td className="px-4 py-2 text-right">{item.quantity !== undefined ? item.quantity : '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
      </SectionCard>
      
       <SectionCard title="กลยุทธ์และคำแนะนำ" icon={<TargetIcon />}>
           <ValueDisplay label="Next Best Action" value={strategicRecommendations.nextBestAction} />
           <ValueDisplay label="ข้อเสนอแนะ" value={strategicRecommendations.suggestedOffer} />
           
           <div className="mt-4">
                <h4 className="font-semibold text-slate-800 dark:text-slate-200 mb-2">กลยุทธ์โดยละเอียด:</h4>
                <div className="space-y-3">
                    {strategicRecommendations.detailedStrategy.map((item, index) => (
                        <div key={index} className="p-3 bg-white/50 dark:bg-black/20 rounded-lg border border-slate-200 dark:border-white/10">
                            <div className="flex justify-between items-center">
                                <p className="font-semibold text-sky-700 dark:text-sky-300">{item.recommendation}</p>
                                <span className="text-xs font-bold text-sky-800 dark:text-slate-200 bg-sky-200/70 dark:bg-sky-600/50 px-2 py-1 rounded-full">{item.successProbability}% Success</span>
                            </div>
                            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">{item.reasoning}</p>
                        </div>
                    ))}
                </div>
           </div>
       </SectionCard>


      {transcribedText && transcribedText.length > 0 && ( 
        <SectionCard title="บทสนทนา" icon={<ClipboardIcon />}>
          {renderTranscribedText(transcribedText)}
        </SectionCard>
      )}

      {/* Add new icons used */}
      <div style={{ display: 'none' }}>
        <LightBulbIcon /> <ChartBarIcon /> <CheckCircleIcon /> <XCircleIcon /> <TargetIcon />
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fadeIn { animation: fadeIn 0.5s ease-out forwards; }
      `}} />
    </div>
  );
};