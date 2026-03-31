/**
 * Field definitions extracted from Drinkat Google Forms (public view).
 * Keys use snake_case; Yes/No questions use type select.
 */

const yn = { type: 'select' as const, required: true as const, options: ['Yes', 'No'] };

export type DrinkatFormSeed = {
  category: 'qc' | 'marketing' | 'kitchen' | 'cash';
  title: string;
  description?: string;
  sortOrder: number;
  /** Department names (must exist in DB) — empty = use category-only visibility for staff */
  assignedDepartmentNames: string[];
  fields: {
    key: string;
    label: string;
    type: 'text' | 'textarea' | 'number' | 'date' | 'checkbox' | 'select' | 'photo';
    required?: boolean;
    options?: string[];
  }[];
};

export const DRINKAT_FORM_SEEDS: DrinkatFormSeed[] = [
  {
    category: 'qc',
    title: 'Quality Control',
    description: 'Evaluator, branch, and shift',
    sortOrder: 10,
    assignedDepartmentNames: ['QC'],
    fields: [
      { key: 'evaluator_name', label: 'Evaluator Name', type: 'text', required: true },
      { key: 'branch', label: 'Branch Name', type: 'select', required: true, options: ['HU', 'LTUC', 'MEU'] },
      {
        key: 'shift_time',
        label: 'Shift Time (وقت الشفت)',
        type: 'select',
        required: true,
        options: ['Morning Shift', 'Night Shift'],
      },
    ],
  },
  {
    category: 'marketing',
    title: 'Marketing Team Check up',
    description: 'Please fill the form weekly on Friday',
    sortOrder: 20,
    assignedDepartmentNames: ['Marketing'],
    fields: [
      { key: 'name', label: 'Name', type: 'text', required: true },
      {
        key: 'stories_delivered',
        label: 'Amount of stories delivered',
        type: 'select',
        required: true,
        options: ['>5', '5', '5> AND 5<10', 'All required'],
      },
      {
        key: 'reels_shooted',
        label: 'Amount of reels shooted',
        type: 'select',
        required: true,
        options: ['All required', 'Less that required'],
      },
      {
        key: 'vids_edited',
        label: 'Amount of vids edited',
        type: 'select',
        required: true,
        options: ['All required', 'Less than required'],
      },
      {
        key: 'days_on_site',
        label: 'DAYS ON SITE',
        type: 'select',
        required: true,
        options: ['2', '3', '4', '5'],
      },
      {
        key: 'customer_interaction',
        label: 'Did you interact with customers?',
        type: 'select',
        required: true,
        options: ['Yes', 'No'],
      },
      { key: 'total_hours_on_site', label: 'Total hours on site', type: 'text', required: true },
    ],
  },
  {
    category: 'kitchen',
    title: 'Opening Shift Kitchen',
    description: 'Kitchen Opening Checklist',
    sortOrder: 30,
    assignedDepartmentNames: [],
    fields: [
      { key: 'branch', label: 'Branch Name', type: 'select', required: true, options: ['HU', 'LTUC', 'MEU'] },
      { key: 'chef_name', label: 'Chef Name — اسم الشيف', type: 'text', required: true },
      { key: 'orders_received', label: 'أستلام جميع الطلبيات وترتيبها', ...yn },
      { key: 'equipment_clean', label: 'تشيك على نظافة المعدات كاملة', ...yn },
      {
        key: 'shop_clean_areas',
        label: 'تشيك على نظافة المحل (منطقة التسليم / المستودع / المجلى / الأرضية)',
        ...yn,
      },
      { key: 'gas_check', label: 'تشيك على الغاز', ...yn },
      {
        key: 'fridge_temperature_ok',
        label:
          'تشيك على درجة حرارة الثلاجات (ثلاجة التحضير 2–5 / ثلاجة لحمة 0–3 / الفريزر -20 to -27)',
        ...yn,
      },
      {
        key: 'cheese_prep',
        label: 'تحضير الأجبان وتقطيعها (موزريلا / كشكوان / حلوم / بارمزان)',
        ...yn,
      },
      {
        key: 'veg_prep',
        label: 'تحضير وتقطيع الخضار (خس / بصل / شيري تومتو / فلفل)',
        ...yn,
      },
      {
        key: 'sauces_prep',
        label: 'تحضير الصوصات (درن Sauce / sauce لحمة / sauce الحار)',
        ...yn,
      },
      {
        key: 'packaging_fill',
        label: 'تعبئة الورقيات (الأكياس / ورق التغليف / صحون الوجبات / فاين / كتلري / كاتشب)',
        ...yn,
      },
      { key: 'dates_on_products', label: 'وضع تواريخ على جميع الأصناف داخل المحل', ...yn },
      {
        key: 'travil_notes',
        label: 'ترفيل — سجل الخبز، اللحمة، الخضروات، المخلل، الأجبان، علب الصوص، ثلاجة الماتركس، كاتشب',
        type: 'textarea',
        required: false,
      },
    ],
  },
  {
    category: 'kitchen',
    title: 'Closing Shift Kitchen',
    description: 'Kitchen Closing Checklist',
    sortOrder: 31,
    assignedDepartmentNames: [],
    fields: [
      { key: 'branch', label: 'Branch Name', type: 'select', required: true, options: ['HU', 'LTUC', 'MEU'] },
      { key: 'chef_name', label: 'Chef Name — اسم الشيف', type: 'text', required: true },
      {
        key: 'prep_fridge_clean',
        label: 'تشطيب ثلاجة التحضير من الداخل ومن الخارج بالمواد المخصصة GX6',
        ...yn,
      },
      { key: 'grill_clean', label: 'تشطيب الجريل بالمواد المخصصة GX2', ...yn },
      { key: 'potato_holder_clean', label: 'تشطيب حافظة البطاطا', ...yn },
      { key: 'sink_sauce_clean', label: 'تشطيب السنك والصوصريات', ...yn },
      { key: 'walls_surfaces_clean', label: 'تشطيب الحيط والأسطح', ...yn },
      {
        key: 'grill_area_stainless',
        label: 'تشطيب منطقة الجريل والفراير ستانلس بالمواد المخصصة Dirt buste',
        ...yn,
      },
      { key: 'fryer_oil', label: 'تشطيب الفراير تصفية الزيت', ...yn },
      { key: 'utensils_washed', label: 'جلي العدة المستخدمة', ...yn },
      { key: 'gas_closed', label: 'تأكد من إغلاق جرار الغاز', ...yn },
      { key: 'sweep_under_equipment', label: 'تكنيس وشطف تحت جميع الأجهزة', ...yn },
      { key: 'trash_bags', label: 'تفريغ وتبديل الطرشات', ...yn },
      { key: 'warehouse_closed', label: 'تسكير المستودع', ...yn },
      {
        key: 'stock_inventory_notes',
        label:
          'التأكد من وجود كميات من المواد (خس، بصل، فلفل، شيري تومتو، جبن، فرايز، خبز، لحمة، مخلل، صوص، فاين، كتلري، صحون، أكياس، ورق قصدير، جلفز، زيت، تحضير صوص، ملح، علب صوص، ماتركس، نكشات، كاتشب، منظفات…)',
        type: 'textarea',
        required: false,
      },
      { key: 'reported_shortages', label: 'هل تم تبليغ المسؤول عن جميع النواقص', ...yn },
    ],
  },
  {
    category: 'kitchen',
    title: 'Kitchen Handover',
    description: 'Kitchen Handover',
    sortOrder: 32,
    assignedDepartmentNames: [],
    fields: [
      { key: 'branch', label: 'Branch Name', type: 'select', required: true, options: ['HU', 'LTUC', 'MEU'] },
      { key: 'chef_receiving', label: 'Chef Name — اسم الشيف (المستلم)', type: 'text', required: true },
      { key: 'chef_giving', label: 'Chef Name — اسم الشيف (صاحب الشفت)', type: 'text', required: true },
      { key: 'restaurant_equipment_ready', label: 'التأكد من جاهزية المطعم ونظافة المعدات', ...yn },
      { key: 'delivery_area_clean', label: 'التأكد من نظافة منطقة التسليم', ...yn },
      { key: 'delivery_travil', label: 'التأكد من ترفيل منطقة التسليم', ...yn },
      {
        key: 'grill_fryer_prep_clean',
        label: 'التأكد من تنظيف (الجريل / الفراير / حاضنة البطاطا / ثلاجة التحضير)',
        ...yn,
      },
      { key: 'interior_exterior_clean', label: 'التأكد من نظافة المحل الخارجية والداخلية', ...yn },
      { key: 'prep_fridge_counters', label: 'التأكد من تحضير جميع الكونترات داخل ثلاجة التحضير', ...yn },
      { key: 'dates_correct', label: 'التأكد من وجود تواريخ صحيحة على كافة الأصناف', ...yn },
      { key: 'trash_emptied', label: 'التأكد من تفرغة وتبديل الطرشات', ...yn },
      { key: 'veg_prep_stock', label: 'التأكد من وجود كميات كافية محضرة من الخضار', ...yn },
      { key: 'sauce_prep_stock', label: 'التأكد من وجود كميات كافية محضرة من الصوصات', ...yn },
      { key: 'bread_stock', label: 'التأكد من وجود كميات كافية محضرة من الخبز', ...yn },
      { key: 'meat_stock', label: 'التأكد من وجود كميات كافية محضرة من اللحمة', ...yn },
      { key: 'fries_stock', label: 'التأكد من وجود كميات كافية محضرة من الفرايز', ...yn },
      { key: 'packaging_stock', label: 'التأكد من وجود كميات كافية من packaging', ...yn },
      { key: 'oil_ok', label: 'التأكد من صلاحية الزيت', ...yn },
      { key: 'gas_ok', label: 'التأكد من الغاز', ...yn },
      { key: 'report_issues', label: 'تبليغ المسؤول في حال وجود خلل أو نقص', ...yn },
    ],
  },
  {
    category: 'kitchen',
    title: 'Deep Clean',
    description: 'Periodic deep clean checklist',
    sortOrder: 33,
    assignedDepartmentNames: [],
    fields: [
      { key: 'branch', label: 'Branch Name', type: 'select', required: true, options: ['HU', 'LTUC', 'MEU'] },
      { key: 'staff_name', label: 'Name', type: 'text', required: true },
      { key: 'date', label: 'Date', type: 'date', required: true },
      { key: 'floors_walls_done', label: 'Floors & walls deep cleaned', ...yn },
      { key: 'hood_filters_done', label: 'Hood & filters degreased', ...yn },
      { key: 'under_equipment_done', label: 'Under all equipment cleaned', ...yn },
      { key: 'storage_shelves_done', label: 'Storage / shelves sanitized', ...yn },
      { key: 'walkin_fridge_done', label: 'Walk-in / fridges fully cleaned', ...yn },
      { key: 'notes', label: 'Notes', type: 'textarea', required: false },
    ],
  },
  {
    category: 'cash',
    title: 'Cash Form',
    description: 'End-of-shift cash reconciliation',
    sortOrder: 40,
    assignedDepartmentNames: [],
    fields: [
      { key: 'branch', label: 'Branch Name', type: 'select', required: true, options: ['HU', 'LTUC', 'MEU'] },
      { key: 'shift', label: 'Shift', type: 'select', required: true, options: ['Morning', 'Night'] },
      { key: 'staff_name', label: 'Staff name', type: 'text', required: true },
      { key: 'opening_float', label: 'Opening float (JOD)', type: 'number', required: true },
      { key: 'cash_sales', label: 'Cash sales (JOD)', type: 'number', required: true },
      { key: 'card_sales', label: 'Card / other (JOD)', type: 'number', required: false },
      { key: 'expected_cash', label: 'Expected cash in drawer (JOD)', type: 'number', required: true },
      { key: 'counted_cash', label: 'Counted cash (JOD)', type: 'number', required: true },
      { key: 'variance_notes', label: 'Variance / notes', type: 'textarea', required: false },
    ],
  },
];
