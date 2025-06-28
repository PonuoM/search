import React, { useEffect } from 'react';
import type { AnalysisResult, CallMetadata } from '../types';
import { CheckCircleIcon } from './icons/CheckCircleIcon';
import { XCircleIcon } from './icons/XCircleIcon';


interface PdfReportProps {
  result: AnalysisResult;
  callMetadata: CallMetadata | null;
  salespersonName: string | null;
  onRendered: () => void;
}

const SectionTitle: React.FC<{ title: string; className?: string }> = ({ title, className = '' }) => (
  <h2 className={`text-sm font-bold text-slate-800 tracking-wider uppercase border-b-2 border-teal-500 pb-1 mb-3 ${className}`}>
    {title}
  </h2>
);

const DetailItem: React.FC<{ label: string; value: string | undefined | null }> = ({ label, value }) => (
    <div className="text-xs mb-1">
        <span className="font-semibold text-slate-600">{label}:</span>
        <span className="text-slate-800 ml-1">{value ?? 'N/A'}</span>
    </div>
);

const MetricTag: React.FC<{ label: string; value: string }> = ({ label, value }) => (
    <div className="bg-slate-200/80 rounded-md px-2 py-1 flex justify-between items-center">
        <span className="text-xs font-medium text-slate-700">{label}</span>
        <span className="text-xs font-bold text-teal-700">{value}</span>
    </div>
);

const EvaluationList: React.FC<{ items: string[], type: 'strength' | 'improvement' }> = ({ items, type }) => {
    const isStrength = type === 'strength';
    const iconColor = isStrength ? 'text-teal-600' : 'text-rose-600';
    const icon = isStrength ? <CheckCircleIcon className={`w-3.5 h-3.5 ${iconColor}`} /> : <XCircleIcon className={`w-3.5 h-3.5 ${iconColor}`} />;

    return (
        <ul className="space-y-1.5">
            {(items && items.length > 0) ? items.map((item, i) => (
                <li key={i} className="flex items-start text-xs">
                    <span className="mt-0.5 mr-1.5 shrink-0">{icon}</span>
                    <span className="text-slate-700">{item}</span>
                </li>
            )) : <li className="text-xs text-slate-500 italic ml-5">ไม่มีข้อมูล</li>}
        </ul>
    );
};

export const PdfReport: React.FC<PdfReportProps> = ({ result, callMetadata, salespersonName, onRendered }) => {
    const { salespersonEvaluation, customerEvaluation, situationalEvaluation, strategicRecommendations } = result;

    useEffect(() => {
        const timer = setTimeout(() => {
            onRendered();
        }, 500); 
        return () => clearTimeout(timer);
    }, [onRendered]);

    const customerPhone = callMetadata?.callType === 'โทรออก' 
        ? callMetadata.destinationPhone 
        : callMetadata.sourcePhone;
    
    return (
        <div style={{ fontFamily: "'Noto Sans Thai', sans-serif" }} className="w-[794px] bg-white text-black font-sans box-border text-slate-800 p-8">
            <div className="flex gap-x-8">
                {/* Left Main Column */}
                <div className="w-[65%]">
                    <header className="mb-6">
                        <h1 className="text-3xl font-bold text-slate-800 tracking-tight">{salespersonName ?? 'Sales Analysis'}</h1>
                        <p className="text-md text-teal-600 font-medium">รายงานสรุปผลการวิเคราะห์การขาย</p>
                    </header>

                    <section className="mb-6">
                        <SectionTitle title="Executive Summary" />
                        <p className="text-xs text-slate-600 leading-relaxed">
                            {situationalEvaluation.callOutcomeSummary}
                        </p>
                    </section>

                    <section>
                        <SectionTitle title="Strategic Recommendations" />
                        <div className="space-y-4">
                            <div>
                                <h3 className="text-sm font-bold text-slate-700">Next Best Action</h3>
                                <p className="text-xs text-slate-600 mt-0.5">{strategicRecommendations.nextBestAction}</p>
                            </div>

                            {strategicRecommendations.detailedStrategy.map((item, index) => (
                                <div key={index}>
                                    <h4 className="text-sm font-bold text-slate-700">{item.recommendation}</h4>
                                    <p className="text-xs text-slate-500 mb-1">Success Probability: {item.successProbability}%</p>
                                    <p className="text-xs text-slate-600">{item.reasoning}</p>
                                </div>
                            ))}
                        </div>
                    </section>
                </div>

                {/* Right Sidebar Column */}
                <div className="w-[35%]">
                    <section className="mb-5">
                        <SectionTitle title="Call Details" />
                        <DetailItem label="Date" value={callMetadata?.date} />
                        <DetailItem label="Time" value={callMetadata?.time} />
                        <DetailItem label="Salesperson" value={salespersonName} />
                        <DetailItem label="Customer Phone" value={customerPhone} />
                    </section>

                    <section className="mb-5">
                        <SectionTitle title="Key Metrics" />
                        <div className="space-y-2">
                           <MetricTag label="Closing Probability" value={`${situationalEvaluation.closingProbability}%`} />
                           <MetricTag label="SP Performance" value={`${salespersonEvaluation.overallPerformanceScore}%`} />
                           <MetricTag label="Customer Interest" value={`${customerEvaluation.interestLevel}/10`} />
                           <MetricTag label="Closing Skill" value={`${salespersonEvaluation.closingSkillScore}/10`} />
                        </div>
                    </section>
                    
                    <section className="mb-5">
                        <SectionTitle title="Salesperson Evaluation" />
                        <h3 className="text-xs font-semibold text-slate-600 mb-1.5">จุดแข็ง</h3>
                        <EvaluationList items={salespersonEvaluation.strengths} type="strength" />
                        <h3 className="text-xs font-semibold text-slate-600 mt-3 mb-1.5">จุดที่ควรปรับปรุง</h3>
                        <EvaluationList items={salespersonEvaluation.areasForImprovement} type="improvement" />
                    </section>
                    
                    <section>
                        <SectionTitle title="Customer Insights" />
                        <div className="space-y-2">
                           <p className="text-xs text-slate-600"><strong className="font-semibold">Profile:</strong> {customerEvaluation.customerProfile}</p>
                           <p className="text-xs text-slate-600"><strong className="font-semibold">Decision Factors:</strong> {customerEvaluation.decisionMakingFactors.join(', ') || 'N/A'}</p>
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
};
