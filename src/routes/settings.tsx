import { createFileRoute } from '@tanstack/react-router';
import { AdminApp } from '@/components/admin-app';
export const Route = createFileRoute('/settings')({head:()=>({meta:[{title:'إعدادات الربط | تمكين'},{name:'description',content:'إعداد اتصال إدارة تمكين ببوت n8n.'},{property:'og:title',content:'إعدادات الربط | تمكين'},{property:'og:description',content:'إدارة اتصال قنوات العملاء.'},{property:'og:type',content:'website'},{name:'twitter:card',content:'summary_large_image'}]}),component:()=> <AdminApp view="settings"/>});
