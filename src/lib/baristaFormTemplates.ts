import type { FormFieldDef } from '@/lib/formTemplate';

export type BaristaFormTemplate = {
  category: 'kitchen';
  title: string;
  description?: string;
  googleFormId: string;
  fields: FormFieldDef[];
};

export const BARISTA_FORM_TEMPLATES: BaristaFormTemplate[] = [
  {
    category: 'kitchen',
    title: 'Barista Opening Checklist',
    googleFormId: "1FAIpQLSfkWTJ-DkNl9VUgNhwNcmoa5zBiKKRpCA9zo5PAkzRdKwuseQ",
    fields: [
          {
                "key": "branch_name",
                "label": "Branch Name",
                "type": "select",
                "required": true,
                "options": [
                      "HU",
                      "LTUC",
                      "MEU"
                ]
          },
          {
                "key": "barista_name",
                "label": "Barista Name - اسم الباريستا",
                "type": "text",
                "required": true
          },
          {
                "key": "q_03",
                "label": "تشغيل الماكينات",
                "type": "select",
                "required": true,
                "options": [
                      "Yes",
                      "No"
                ]
          },
          {
                "key": "cash_float",
                "label": "فتح الكاش والتأكد من Cash Float",
                "type": "select",
                "required": true,
                "options": [
                      "Yes",
                      "No"
                ]
          },
          {
                "key": "careem_talabat_mythings",
                "label": "التأكد من تشغيل أجهزة التوصيل (Careem/Talabat/Mythings)",
                "type": "select",
                "required": true,
                "options": [
                      "Yes",
                      "No"
                ]
          },
          {
                "key": "q_06",
                "label": "التأكد من تشغيل هاتف المحل + تشغيل السماعات",
                "type": "select",
                "required": true,
                "options": [
                      "Yes",
                      "No"
                ]
          },
          {
                "key": "q_07",
                "label": "ترفيل جميع الخزاين والثلاجات و الفريزر من المستودع",
                "type": "select",
                "required": true,
                "options": [
                      "Yes",
                      "No"
                ]
          },
          {
                "key": "q_08",
                "label": "عمل كالبريشن للمشين وأرفاقه على كالبريشن فورم",
                "type": "select",
                "required": true,
                "options": [
                      "Yes",
                      "No"
                ]
          },
          {
                "key": "q_09",
                "label": "أستلام جميع الطلبيات والتأكد منها وتشيك على النواقص+ ترتيبها بالمستودع",
                "type": "select",
                "required": true,
                "options": [
                      "Yes",
                      "No"
                ]
          },
          {
                "key": "gx6",
                "label": "مسح أسطح البار GX6",
                "type": "select",
                "required": true,
                "options": [
                      "Yes",
                      "No"
                ]
          },
          {
                "key": "q_11",
                "label": "أخراج الصوصريات من الثلاجة وترفيلهم",
                "type": "select",
                "required": true,
                "options": [
                      "Yes",
                      "No"
                ]
          },
          {
                "key": "q_12",
                "label": "ترفيل منجا ليمون",
                "type": "select",
                "required": true,
                "options": [
                      "Yes",
                      "No"
                ]
          },
          {
                "key": "q_13",
                "label": "تلقيط نعنع + تقشير كيوي",
                "type": "select",
                "required": true,
                "options": [
                      "Yes",
                      "No"
                ]
          },
          {
                "key": "q_14",
                "label": "مسح الارض كاملة بأستخدام المنظف المطلوب",
                "type": "select",
                "required": true,
                "options": [
                      "Yes",
                      "No"
                ]
          },
          {
                "key": "q_15",
                "label": "مسح وتنظيف ثلاجة الفواكة",
                "type": "select",
                "required": true,
                "options": [
                      "Yes",
                      "No"
                ]
          },
          {
                "key": "under_counter",
                "label": "ترفيل ثلاجة Under counter",
                "type": "select",
                "required": true,
                "options": [
                      "Yes",
                      "No"
                ]
          },
          {
                "key": "q_17",
                "label": "تحضير رمان وبرتقال وليمون ومنجا",
                "type": "select",
                "required": true,
                "options": [
                      "Yes",
                      "No"
                ]
          },
          {
                "key": "q_18",
                "label": "تحضير سبانيش",
                "type": "select",
                "required": true,
                "options": [
                      "Yes",
                      "No"
                ]
          },
          {
                "key": "q_19",
                "label": "وضع تواريخ على كافة الأصناف داخل المحل",
                "type": "select",
                "required": true,
                "options": [
                      "Yes",
                      "No"
                ]
          },
          {
                "key": "under_counter_3_5_4_6_20_27",
                "label": "تشيك على درجة حرارة الثلاجات ثلاجة Under Counter 3-5 ثلاجة العرض 4-6 الفريزر 20- -27",
                "type": "select",
                "required": true,
                "options": [
                      "Yes",
                      "No"
                ]
          },
          {
                "key": "q_21",
                "label": "التشيك على نظافة المحل كاملة من الخارج والداخل",
                "type": "select",
                "required": true,
                "options": [
                      "Yes",
                      "No"
                ]
          }
    ],
  },
  {
    category: 'kitchen',
    title: "Barista Closing Checklist",
    googleFormId: "1FAIpQLSceAaDhqG93wOGV6zSx48cWLZLGQS4brE-dUKa2mk25_Z6GTg",
    fields: [
          {
                "key": "branch_name",
                "label": "Branch Name",
                "type": "select",
                "required": true,
                "options": [
                      "HU",
                      "LTUC",
                      "MEU"
                ]
          },
          {
                "key": "barista_name",
                "label": "Barista Name - اسم الباريستا",
                "type": "text",
                "required": true
          },
          {
                "key": "q_03",
                "label": "تنظيف ماكينة الأسبريسو والمطحنة",
                "type": "select",
                "required": true,
                "options": [
                      "Yes",
                      "No"
                ]
          },
          {
                "key": "q_04",
                "label": "جلي وتنظيف جروبات المشين والبتشرات",
                "type": "select",
                "required": true,
                "options": [
                      "Yes",
                      "No"
                ]
          },
          {
                "key": "q_05",
                "label": "تنظيف جار الكوكيز",
                "type": "select",
                "required": true,
                "options": [
                      "Yes",
                      "No"
                ]
          },
          {
                "key": "q_06",
                "label": "غسل جميع جلد البار",
                "type": "select",
                "required": true,
                "options": [
                      "Yes",
                      "No"
                ]
          },
          {
                "key": "q_07",
                "label": "تنظيف جميع أسطح البار",
                "type": "select",
                "required": true,
                "options": [
                      "Yes",
                      "No"
                ]
          },
          {
                "key": "q_08",
                "label": "مسح جميع الخزائن",
                "type": "select",
                "required": true,
                "options": [
                      "Yes",
                      "No"
                ]
          },
          {
                "key": "q_09",
                "label": "مسح وتنظيف جميع الثلاجات من الداخل والخارج",
                "type": "select",
                "required": true,
                "options": [
                      "Yes",
                      "No"
                ]
          },
          {
                "key": "q_10",
                "label": "جلي وتنظيف الخلاطات",
                "type": "select",
                "required": true,
                "options": [
                      "Yes",
                      "No"
                ]
          },
          {
                "key": "q_11",
                "label": "التأكد من اتلاف المواد منتهية الصلاحية وتسجيلها",
                "type": "select",
                "required": true,
                "options": [
                      "Yes",
                      "No"
                ]
          },
          {
                "key": "q_12",
                "label": "التأكد من نظافة المجلى وتنشيف الجلي بالكامل",
                "type": "select",
                "required": true,
                "options": [
                      "Yes",
                      "No"
                ]
          },
          {
                "key": "q_13",
                "label": "غسل وتعقيم جميع الفوط",
                "type": "select",
                "required": true,
                "options": [
                      "Yes",
                      "No"
                ]
          },
          {
                "key": "q_14",
                "label": "تفريغ وتبديل الطرشات",
                "type": "select",
                "required": true,
                "options": [
                      "Yes",
                      "No"
                ]
          },
          {
                "key": "q_15",
                "label": "شطف الأرض",
                "type": "select",
                "required": true,
                "options": [
                      "Yes",
                      "No"
                ]
          },
          {
                "key": "q_16",
                "label": "وضع جميع الأجهزة على الشاحن (جهاز الفيزا / الهاتف / أجهزة الديلفري )",
                "type": "select",
                "required": true,
                "options": [
                      "Yes",
                      "No"
                ]
          },
          {
                "key": "q_17",
                "label": "أطفاء انارة المحل",
                "type": "select",
                "required": true,
                "options": [
                      "Yes",
                      "No"
                ]
          },
          {
                "key": "q_18",
                "label": "تسكير المحل + المخزن",
                "type": "select",
                "required": true,
                "options": [
                      "Yes",
                      "No"
                ]
          },
          {
                "key": "q_19",
                "label": "تشغيل جهاز الأنذار",
                "type": "select",
                "required": true,
                "options": [
                      "Yes",
                      "No"
                ]
          },
          {
                "key": "q_20",
                "label": "التأكد من طلب جميع النواقص من المسؤول",
                "type": "select",
                "required": true,
                "options": [
                      "Yes",
                      "No"
                ]
          }
    ],
  },
  {
    category: 'kitchen',
    title: "Barista Handover",
    googleFormId: "1FAIpQLSe8PJqp6GFuWHQ9gjahhmmCzHav_El8YJz2-MxO6-NIcOwFvw",
    fields: [
          {
                "key": "branch_name",
                "label": "Branch Name",
                "type": "select",
                "required": true,
                "options": [
                      "HU",
                      "LTUC",
                      "MEU"
                ]
          },
          {
                "key": "barista_name_receiving",
                "label": "Barista Name - اسم الباريستا(المستلم)",
                "type": "text",
                "required": true
          },
          {
                "key": "barista_name_shift_owner",
                "label": "Barista Name - اسم الباريستا(صاحب الشفت)",
                "type": "text",
                "required": true
          },
          {
                "key": "q_04",
                "label": "تشيك على نظافة البارات والأرضيات",
                "type": "select",
                "required": true,
                "options": [
                      "✅",
                      "❌"
                ]
          },
          {
                "key": "q_05",
                "label": "تشيك على نظافة الماكينات جميعها",
                "type": "select",
                "required": true,
                "options": [
                      "✅",
                      "❌"
                ]
          },
          {
                "key": "q_06",
                "label": "تشيك على نظافة السنك وعدم وجود جلي داخله أو حوله",
                "type": "select",
                "required": true,
                "options": [
                      "✅",
                      "❌"
                ]
          },
          {
                "key": "q_07",
                "label": "تشيك على نظافة المحل من الداخل والخارج",
                "type": "select",
                "required": true,
                "options": [
                      "✅",
                      "❌"
                ]
          },
          {
                "key": "q_08",
                "label": "تشيك على جميع التحضيرات الصباحية منها (منجا/ليمون/نعنع/كيوي/سبانيش)",
                "type": "select",
                "required": true,
                "options": [
                      "✅",
                      "❌"
                ]
          },
          {
                "key": "q_09",
                "label": "تشيك على ترفيل جميع الصوصات",
                "type": "select",
                "required": true,
                "options": [
                      "✅",
                      "❌"
                ]
          },
          {
                "key": "q_10",
                "label": "تشيك على ترفيل علب السيرفس(فاين/سترو/ستكس/ستكرات)",
                "type": "select",
                "required": true,
                "options": [
                      "✅",
                      "❌"
                ]
          },
          {
                "key": "q_11",
                "label": "تشيك على ترفيل الفريزر والخزاين وثلاجات واحضار بضاعة من المستودع",
                "type": "select",
                "required": true,
                "options": [
                      "✅",
                      "❌"
                ]
          },
          {
                "key": "q_12",
                "label": "هل تم التبليغ في حال عدم توافر منتج معين",
                "type": "select",
                "required": true,
                "options": [
                      "✅",
                      "❌"
                ]
          },
          {
                "key": "q_13",
                "label": "أستلام الكاش/الفيزا",
                "type": "select",
                "required": true,
                "options": [
                      "✅",
                      "❌"
                ]
          }
    ],
  },
  {
    category: 'kitchen',
    title: 'Barista Deep Clean',
    googleFormId: '1FAIpQLScPWD0X38-pFW6ljHuKkgaVonid9oBCc-LhHqvKbv79p4sfNQ',
    fields: [
      {
        key: 'branch_name',
        label: 'Branch Name',
        type: 'select',
        required: false,
        options: ['LTUC', 'HU', 'MEU'],
      },
      {
        key: 'barista_name',
        label: 'Barista Name',
        type: 'text',
        required: false,
      },
      {
        key: 'shift_time',
        label: 'Shift Time',
        type: 'select',
        required: false,
        options: ['Morning shift', 'Mid shift', 'Night shift'],
      },
      {
        key: 'field_4',
        label: 'تنظيف المستودع بالكامل (السبت)',
        type: 'photo',
        required: false,
      },
      {
        key: 'field_5',
        label: 'تنظيف القعدة الخارجية الدرج(الأثنين/الأربعاء/السبت)',
        type: 'photo',
        required: false,
      },
      {
        key: 'field_6',
        label: 'الخزاين-الرفوف-الأحد',
        type: 'photo',
        required: false,
      },
      {
        key: 'field_7',
        label: 'تفريغ وتنظيف الفريزر بالكامل -  الأثنين',
        type: 'photo',
        required: false,
      },
      {
        key: 'field_8',
        label: 'تنظيف الثلاجات (ثلاجة تحت البار+ثلاجة الفواكة) -  الثلاثاء',
        type: 'photo',
        required: false,
      },
      {
        key: 'field_9',
        label: 'تنظيف ماكينة الاسبريسو والمطحنة وعمل بوليكاف بنهاية الشفت لجميع أجزائها -الأربعاء',
        type: 'photo',
        required: false,
      },
      {
        key: 'field_10',
        label: 'تفريغ وتنظيف ماكينة السلش-الخميس',
        type: 'photo',
        required: false,
      },
      {
        key: 'field_11',
        label: 'شطف الدرج وتنظيف وترتيب المحل من الخارج-يومي',
        type: 'photo',
        required: false,
      },
      {
        key: 'field_12',
        label: 'تنظيف وتمسيح الطرشات - الأحد',
        type: 'photo',
        required: false,
      },
      {
        key: 'field_13',
        label: 'تنظيف الايس ميكر - الأثنين',
        type: 'photo',
        required: false,
      },
      {
        key: 'field_14',
        label: 'جلي جميع ستاندات السيربات+ الكاسات +علب الجلي - الثلاثاء',
        type: 'photo',
        required: false,
      },
    ],
  },
];
