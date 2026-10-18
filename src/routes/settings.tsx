import { createFileRoute } from '@tanstack/react-router';
import { AdminApp } from '@/components/admin-app';
export const Route = createFileRoute('/settings')({head:()=>({meta:[{title:'إعدادات الربط | عرش الهندسة'},{name:'description',content:'إعداد اتصال إدارة عرش الهندسة ببوت n8n.'},{property:'og:title',content:'إعدادات الربط | عرش الهندسة'},{property:'og:description',content:'إدارة اتصال قنوات العملاء.'},{property:'og:type',content:'website'},{name:'twitter:card',content:'summary_large_image'}]}),component:()=> <AdminApp view="settings"/>});
