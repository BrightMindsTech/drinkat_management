import type { FormFieldDef } from '@/lib/formTemplate';

type DefaultTemplate = {
  category: 'qc' | 'marketing' | 'kitchen' | 'cash';
  title: string;
  description?: string;
  fields: FormFieldDef[];
};

function yn(label: string, key: string): FormFieldDef {
  return {
    key,
    label,
    type: 'select',
    required: true,
    options: ['Yes', 'No'],
  };
}

function mark(label: string, key: string): FormFieldDef {
  return {
    key,
    label,
    type: 'select',
    required: true,
    options: ['✅', '❌'],
  };
}

export const DEFAULT_FORM_TEMPLATES: DefaultTemplate[] = [
  {
    category: 'qc',
    title: 'Quality Control',
    description: 'Comprehensive QC shift audit for kitchen, service, and hygiene.',
    fields: [
      { key: 'evaluator_name', label: 'Evaluator Name', type: 'text', required: true },
      { key: 'branch_name', label: 'Branch Name', type: 'text', required: true },
      { key: 'visit_date', label: 'Visit Date', type: 'date', required: true },
      { key: 'shift_time', label: 'Shift Time', type: 'text', required: true },
      { key: 'manager_name', label: 'Manager on Duty', type: 'text', required: false },
      yn('هل التزام الفريق بالزي والنظافة الشخصية صحيح', 'team_uniform_hygiene_ok'),
      yn('هل جميع درجة حرارة الثلاجات صحيحة', 'kitchen_fridge_temp_ok'),
      yn('هل المطبخ ومعداته نظيفة', 'kitchen_clean'),
      yn('هل تم حفظ المواد الغذائية بشكل سليم', 'food_storage_ok'),
      yn('هل تواريخ الصلاحية واضحة ومحدثة', 'expiry_labels_ok'),
      yn('هل جميع المصارف نظيفة', 'drains_clean'),
      yn('هل منطقة التحضير مرتبة وآمنة', 'prep_area_safe'),
      yn('هل منطقة التسليم نظيفة ومرتبة', 'delivery_area_clean'),
      yn('هل أدوات السلامة متوفرة (قفازات/مطهر/طفاية)', 'safety_tools_available'),
      {
        key: 'customer_service_rating',
        label: 'Customer Service Rating',
        type: 'select',
        required: true,
        options: ['Excellent', 'Good', 'Average', 'Needs improvement'],
      },
      { key: 'critical_issue', label: 'Critical issue found?', type: 'checkbox', required: false },
      { key: 'critical_issue_note', label: 'Critical issue note', type: 'textarea', required: false },
      { key: 'evidence_photo_1', label: 'Evidence photo 1', type: 'photo', required: false },
      { key: 'evidence_photo_2', label: 'Evidence photo 2', type: 'photo', required: false },
      { key: 'weaknesses', label: 'Weaknesses (نقاط الضعف)', type: 'textarea', required: false },
      { key: 'recommendations', label: 'Recommendations (توصيات للتحسين)', type: 'textarea', required: false },
      { key: 'follow_up_required', label: 'Follow-up required in next visit', type: 'checkbox', required: false },
    ],
  },
  {
    category: 'marketing',
    title: 'Marketing Performance',
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
        options: ['All required', 'Less than required'],
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
      yn('Did you interact with customers ?', 'customer_interaction'),
      { key: 'total_hours', label: 'total hours on site', type: 'number', required: true },
    ],
  },
  {
    category: 'kitchen',
    title: 'Kitchen Opening Checklist',
    description: 'Opening checks before service starts.',
    fields: [
      { key: 'branch_name', label: 'Branch Name', type: 'text', required: true },
      { key: 'chef_name', label: 'Chef Name - اسم الشيف', type: 'text', required: true },
      yn('أستلم جميع الطلبات وترتيبها', 'received_orders_arranged'),
      yn('تشيك على نظافة المعدات كاملة', 'equipment_clean'),
      yn('تشيك على درجة حرارة الثلاجات', 'fridge_temp_ok'),
      yn('وضع تواريخ على جميع الأصناف داخل المحل', 'dates_set_on_items'),
      {
        key: 'inventory_available',
        label: 'تريفيل - التأكد من وجود كميات من المواد',
        type: 'checkbox',
        required: false,
      },
    ],
  },
  {
    category: 'kitchen',
    title: 'Kitchen Closing Checklist',
    description: 'End-of-day closing and shutdown checks.',
    fields: [
      { key: 'branch_name', label: 'Branch Name', type: 'text', required: true },
      { key: 'chef_name', label: 'Chef Name - اسم الشيف', type: 'text', required: true },
      yn('GX6 تشطيب ثلاجة التحضير من الداخل ومن الخارج', 'gx6_clean'),
      yn('GX2 تشطيب الجريل بالمواد المخصصة', 'gx2_grill_clean'),
      yn('تفريغ وتبديل الطرشات', 'trash_replaced'),
      yn('تسكير المستودع', 'store_closed'),
      yn('تاكد من اغلاق جدار الغاز', 'gas_wall_closed'),
    ],
  },
  {
    category: 'kitchen',
    title: 'Kitchen Handover',
    description: 'Handover checklist between shifts.',
    fields: [
      { key: 'branch_name', label: 'Branch Name', type: 'text', required: true },
      { key: 'receiving_chef', label: 'Chef Name - اسم الشيف (المستلم)', type: 'text', required: true },
      { key: 'shift_chef', label: 'Chef Name - اسم الشيف (صاحب الشفت)', type: 'text', required: true },
      mark('التأكد من جاهزية الطعم ونظافة المعدات', 'food_ready_equipment_clean'),
      mark('التأكد من وجود كميات كافية من الصوصات', 'sauces_ready'),
      mark('التأكد من وجود كميات كافية من الخبز', 'bread_ready'),
      mark('التأكد من وجود كميات كافية من اللحمة', 'meat_ready'),
      mark('التأكد من وجود كميات كافية من الفرايز', 'fries_ready'),
      mark('التأكد من وجود كميات كافية من الخضار', 'vegetables_ready'),
      mark('التأكد من وجود كميات كافية من packaging', 'packaging_ready'),
      mark('التأكد من صلاحية الزيت', 'oil_valid'),
      mark('التأكد من الغاز', 'gas_checked'),
      mark('تبليغ المسؤول في حال وجود خلل او نقص', 'issues_reported'),
      mark('التأكد من نظافة منطقة التسليم', 'delivery_area_clean'),
      mark('التأكد من ترتيب منطقة التسليم', 'delivery_area_arranged'),
      mark('التأكد من نظافة المحل الخارجية والداخلية', 'shop_clean_inside_out'),
    ],
  },
  {
    category: 'kitchen',
    title: 'Kitchen Deep Clean',
    description: 'Weekly deep-clean photo evidence by area/day.',
    fields: [
      { key: 'branch_name', label: 'Branch Name', type: 'text', required: true },
      { key: 'shift_time', label: 'Shift - الشفت', type: 'text', required: true },
      { key: 'chef_name', label: 'Chef Name - اسم الشيف', type: 'text', required: true },
      { key: 'fridge_photo', label: 'ثلاجة التحضير - الأحد (Photo)', type: 'photo', required: false },
      { key: 'grill_photo', label: 'الجريلات - الاثنين (Photo)', type: 'photo', required: false },
      { key: 'hood_walls_photo', label: 'الهود + الحيطان - السبت (Photo)', type: 'photo', required: false },
      { key: 'store_photo', label: 'المستودع تنظيف وترتيب - الخميس (Photo)', type: 'photo', required: false },
      { key: 'delivery_area_photo', label: 'منطقة التسليم وخزائنها - الأربعاء (Photo)', type: 'photo', required: false },
    ],
  },
  {
    category: 'cash',
    title: 'Cash Form',
    description: 'Daily cash reconciliation and handover.',
    fields: [
      { key: 'branch_name', label: 'Branch Name', type: 'text', required: true },
      { key: 'cashier_name', label: 'Cashier Name', type: 'text', required: true },
      { key: 'shift_time', label: 'Shift Time - وقت الشفت', type: 'text', required: true },
      { key: 'total_sales', label: 'Total Sales', type: 'number', required: true },
      { key: 'cash_sales', label: 'Cash Sales', type: 'number', required: true },
      { key: 'visa_sales', label: 'Visa Sales', type: 'number', required: true },
      { key: 'talabat', label: 'Talabat', type: 'number', required: false },
      { key: 'careem', label: 'Careem', type: 'number', required: false },
      { key: 'my_things', label: 'My Things', type: 'number', required: false },
      { key: 'cash_report_photo', label: 'صورة تقرير الكاش - report Cash', type: 'photo', required: false },
      { key: 'maintenance_note', label: 'هل يوجد أي جهاز بالمحل يحتاج الى صيانة', type: 'textarea', required: false },
    ],
  },
];

