

import type { IdentifiedSalesperson } from './types';

export const GEMINI_MODEL_NAME = 'gemini-2.5-flash-preview-04-17';
export const GEMINI_IMAGE_MODEL_NAME = 'imagen-3.0-generate-002'; // Not used in this app but per guidance

const JSON_RESPONSE_STRUCTURE_EXAMPLE = `
{
  "salespersonEvaluation": {
    "strengths": ["สร้างความสัมพันธ์ได้ดี", "มีความกระตือรือร้นในการนำเสนอ"],
    "areasForImprovement": ["ควรนำเสนอข้อมูลทางเทคนิคให้แม่นยำขึ้น", "เทคนิคการปิดการขายยังไม่เฉียบคม"],
    "communicationStyle": "เป็นมิตรและเข้าถึงง่าย",
    "productKnowledgeScore": 7,
    "closingSkillScore": 6,
    "overallPerformanceScore": 75
  },
  "customerEvaluation": {
    "customerProfile": "ลูกค้าเก่า เคยซื้อสินค้า X เมื่อ 6 เดือนก่อน เป็นผู้ใช้จริงแต่ไม่มีอำนาจตัดสินใจ",
    "interestLevel": 8,
    "painPointsIdentified": ["สินค้าปัจจุบันทำงานช้า", "ต้องการลดต้นทุนการดำเนินงาน"],
    "decisionMakingFactors": ["ราคา", "ความง่ายในการใช้งาน", "บริการหลังการขาย"],
    "purchasingBehavior": {
      "summary": "ลูกค้าเคยซื้อสินค้า 'Product A' 1 ชิ้น และ 'Product B' 2 ชิ้น ในปีที่แล้ว รวมยอดซื้อ 15,000 บาท",
      "buyingFrequency": "ประมาณทุกๆ 6 เดือน",
      "typicalPurchaseVolume": "ซื้อครั้งละ 1-2 รายการ",
      "priceSensitivity": "ค่อนข้างอ่อนไหวต่อราคา ตอบสนองต่อโปรโมชั่นส่วนลด"
    },
    "customerSentiment": "มีความสนใจแต่กังวลเรื่องงบประมาณ"
  },
  "situationalEvaluation": {
    "callSentiment": "เชิงบวกเป็นส่วนใหญ่ มีความกังวลช่วงท้าย",
    "currentSalesStage": "การนำเสนอโซลูชัน",
    "keyTopicsDiscussed": ["ฟีเจอร์ใหม่ของ Product C", "เปรียบเทียบกับคู่แข่ง", "ราคาและโปรโมชั่น"],
    "unresolvedQuestions": ["ต้องการใบเสนอราคาอย่างเป็นทางการ", "ใครคือผู้มีอำนาจอนุมัติสุดท้าย"],
    "callOutcomeSummary": "ลูกค้าร้องขอใบเสนอราคาและจะนำไปปรึกษาทีม แม้ลูกค้าจะสนใจสินค้ามาก แต่ได้แจ้งว่าไม่มีงบประมาณสำหรับโครงการนี้ในปีนี้ ทำให้โอกาสปิดการขายทันทีต่ำมาก",
    "closingProbability": 5,
    "positiveSignals": ["ลูกค้าถามถึงขั้นตอนการสั่งซื้อ", "แสดงความสนใจในฟีเจอร์ X อย่างชัดเจน"],
    "negativeSignals": ["ลูกค้ากล่าวถึงงบประมาณที่จำกัดหลายครั้ง", "ยืนยันว่าไม่มีงบประมาณในปีนี้"]
  },
  "strategicRecommendations": {
    "nextBestAction": "ส่งอีเมลสรุปการสนทนาพร้อมใบเสนอราคา และข้อมูลสำหรับของบประมาณในปีถัดไป",
    "talkingPoints": ["เน้นย้ำเรื่องการลดต้นทุนจากการใช้ผลิตภัณฑ์ใหม่", "เสนอ case study ของลูกค้าที่คล้ายกัน"],
    "suggestedOffer": "ส่วนลดพิเศษสำหรับการสั่งซื้อล่วงหน้าสำหรับงบประมาณปีหน้า",
    "potentialUpsellOpportunities": ["เสนอแพ็กเกจบริการดูแลรักษารายปี", "ผลิตภัณฑ์เสริม Y ที่ทำงานร่วมกันได้ดี"],
    "detailedStrategy": [
      {
        "recommendation": "ส่งอีเมลสรุปและใบเสนอราคา",
        "reasoning": "เพื่อรักษาโมเมนตัมและให้ข้อมูลที่เป็นลายลักษณ์อักษรสำหรับให้ลูกค้าไปปรึกษาทีมและวางแผนงบประมาณ",
        "successProbability": 90
      },
      {
        "recommendation": "โทรติดตามผลในอีก 3 เดือนเพื่อสอบถามความคืบหน้าเรื่องงบประมาณ",
        "reasoning": "เพื่อรักษาความสัมพันธ์และแสดงความใส่ใจ เตรียมพร้อมสำหรับโอกาสในอนาคต",
        "successProbability": 60
      }
    ]
  },
  "transcribedText": [
    { "speaker": "ผู้ขาย", "utterance": "สวัสดีครับคุณลูกค้า มีอะไรให้ช่วยไหมครับ", "timestamp": "00:00:02.100" },
    { "speaker": "ลูกค้า", "utterance": "สนใจสอบถามเกี่ยวกับโปรโมชั่นล่าสุดครับ", "timestamp": "00:00:05.500" }
  ]
}`;

const generateSalespersonHintSection = (salesperson?: IdentifiedSalesperson | null): string => {
  if (salesperson) {
    return `
ส่วนที่ 2: คำใบ้เกี่ยวกับพนักงานขาย (Salesperson Hint)
ข้อมูลระบบระบุว่าพนักงานขายในสายนี้คือ:
- ชื่อ: ${salesperson.name}
- เบอร์โทรศัพท์: ${salesperson.phone}

โปรดใช้ข้อมูลนี้เป็น "คำใบ้ที่สำคัญ" เพื่อช่วยในการยืนยันและระบุบทบาทของผู้พูดในการสนทนาให้ถูกต้อง
`;
  }
  return ``;
};

const generateProductContextSection = (productContext?: string | null): string => {
  if (productContext && productContext.trim() !== "") {
    return `
ส่วนที่ 3: ข้อมูลผลิตภัณฑ์ (Product Context)
ใช้รายการด้านล่างนี้เพื่อช่วยในการระบุชื่อผลิตภัณฑ์ที่อาจถูกกล่าวถึงในการสนทนา:
${productContext}
`;
  }
  return ``;
};

const generateCustomerHistorySection = (customerHistoryJSON?: string | null): string => {
    if (customerHistoryJSON && customerHistoryJSON.trim() !== "[]" && customerHistoryJSON.trim() !== "") {
    return `
ส่วนที่ 4: ประวัติการซื้อของลูกค้า (Customer Purchase History)
นี่คือประวัติการซื้อของลูกค้าที่อยู่ในสาย โปรดใช้ข้อมูลนี้เพื่อทำความเข้าใจความสัมพันธ์ของลูกค้ากับบริษัทและปรับการวิเคราะห์ของคุณ:
${customerHistoryJSON}
`;
  }
  return ``;
}

const getBasePrompt = (productContext?: string | null, customerHistory?: any[] | null, salesperson?: IdentifiedSalesperson | null): string => {
    const customerHistoryJSON = customerHistory ? JSON.stringify(customerHistory, null, 2) : null;

    return `
คุณคือสุดยอดโค้ชการขายและนักวิเคราะห์ข้อมูลผู้เชี่ยวชาญ ภารกิจของคุณคือวิเคราะห์การสนทนาการขายอย่างละเอียดเพื่อเพิ่มประสิทธิภาพและโอกาสในการปิดการขาย

**ขั้นตอนการทำงาน (สำคัญมาก):**
1.  **ระบุบทบาทผู้พูด:** งานแรกและสำคัญที่สุดของคุณคือการระบุว่าใครคือ "ผู้ขาย" และใครคือ "ลูกค้า" โดยอิงตามเนื้อหาการสนทนาและคำใบ้ที่ให้มา (ถ้ามี) จากนั้น **ต้อง** แก้ไขป้ายกำกับผู้พูดในผลลัพธ์ \`transcribedText\` ให้เป็น "ผู้ขาย" หรือ "ลูกค้า" ให้ถูกต้องเสมอ
2.  **วิเคราะห์เชิงลึก:** หลังจากระบุบทบาทแล้ว ให้ทำการวิเคราะห์การสนทนาตามหัวข้อต่างๆ

คุณจะได้รับข้อมูลสูงสุด 4 ส่วนเพื่อใช้ในการวิเคราะห์:
1.  **บทสนทนา (จากข้อความหรือไฟล์เสียง):** เนื้อหาหลักของการสนทนา
${generateSalespersonHintSection(salesperson)}
${generateProductContextSection(productContext)}
${generateCustomerHistorySection(customerHistoryJSON)}

วิเคราะห์ข้อมูลทั้งหมดที่ได้รับอย่างละเอียด และทำการประเมินใน 4 หัวข้อหลัก:
1.  **ประเมินพนักงานขาย (Salesperson Evaluation):** วิเคราะห์ประสิทธิภาพของพนักงานขายในด้านต่างๆ
2.  **ประเมินลูกค้า (Customer Evaluation):** ทำความเข้าใจโปรไฟล์ ความต้องการ และความรู้สึกของลูกค้า
3.  **ประเมินสถานการณ์ (Situational Evaluation):** สรุปภาพรวม, บรรยากาศ, และระบุสัญญาณเชิงบวกและลบที่สำคัญจากการสนทนา
4.  **กลยุทธ์และคำแนะนำ (Strategic Recommendations):** เสนอแนะกลยุทธ์ที่เป็นรูปธรรมและวัดผลได้เพื่อนำไปสู่ความสำเร็จ

ข้อกำหนดในการตอบ:
- **ต้องตอบเป็นภาษาไทยเท่านั้น** ในทุกๆ field ของ JSON ห้ามใช้ภาษาอังกฤษโดยเด็ดขาด
- **ระบุบทบาทให้ถูกต้อง:** ใน \`transcribedText\`, ค่า \`speaker\` ต้องเป็น "ผู้ขาย" หรือ "ลูกค้า" เท่านั้น ห้ามใช้ค่าอื่นเช่น "Speaker 1" หรือ "Speaker 2"
- **วิเคราะห์พฤติกรรมการซื้อ:** จากข้อมูลประวัติการซื้อ (ถ้ามี) ให้วิเคราะห์และสรุปพฤติกรรมการซื้อของลูกค้าใน field \`purchasingBehavior\` โดยต้องมีข้อมูล: \`summary\`, \`buyingFrequency\`, \`typicalPurchaseVolume\`, และ \`priceSensitivity\`
- **ความสอดคล้องของข้อมูล (สำคัญมาก):** ผลการวิเคราะห์ในทุกส่วนต้องมีความสมเหตุสมผลและสอดคล้องกัน ตัวอย่างเช่น หาก "ระดับความสนใจของลูกค้า" (interestLevel) สูง แต่ "โอกาสในการปิดการขาย" (closingProbability) กลับต่ำมาก (เช่น 0-10%) คุณต้องอธิบายเหตุผลที่ขัดแย้งกันนี้ให้ชัดเจนในส่วน "สรุปผลลัพธ์การโทร" (callOutcomeSummary) เช่น 'แม้ลูกค้าสนใจ แต่ยืนยันว่าไม่มีงบประมาณสำหรับปีนี้ ทำให้โอกาสปิดการขายเป็น 0%'
- **จัดรูปแบบการตอบกลับทั้งหมดให้เป็นออบเจ็กต์ JSON ที่ถูกต้องเพียงออบเจ็กต์เดียว** และครอบด้วยบล็อกโค้ด Markdown \`\`\`json ... \`\`\` เสมอ
- โครงสร้างของ JSON ต้องเป็นไปตามตัวอย่างนี้ทุกประการ (แทนที่ค่าตัวอย่างด้วยผลการวิเคราะห์ของคุณ):

${JSON_RESPONSE_STRUCTURE_EXAMPLE}
`;
}


export const GEMINI_TEXT_ANALYSIS_PROMPT_TEMPLATE = (transcript: string, productContext?: string | null, customerHistory?: any[] | null, salesperson?: IdentifiedSalesperson | null): string => `
${getBasePrompt(productContext, customerHistory, salesperson)}

--- BEGIN TRANSCRIPT ---
${transcript}
--- END TRANSCRIPT ---
`;

export const GEMINI_AUDIO_ANALYSIS_PROMPT_TEXT_part = (productContext?: string | null, customerHistory?: any[] | null, salesperson?: IdentifiedSalesperson | null): string => `
${getBasePrompt(productContext, customerHistory, salesperson)}

โปรดเริ่มจากการถอดเสียงไฟล์เสียงที่แนบมาเป็นภาษาไทย และใส่ผลลัพธ์ใน field "transcribedText" ของ JSON ตามโครงสร้างที่กำหนด จากนั้นจึงทำการวิเคราะห์ทั้งหมด
`;