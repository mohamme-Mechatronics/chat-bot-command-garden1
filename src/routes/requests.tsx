import { createFileRoute } from '@tanstack/react-router';
import { AdminApp } from '@/components/admin-app';
export const Route = createFileRoute('/requests')({head:()=>({meta:[{title:'طلبات العملاء | عرش الهندسة'},{name:'description',content:'متابعة طلبات العملاء والدراسات وعروض الأسعار.'},{property:'og:title',content:'طلبات العملاء | عرش الهندسة'},{property:'og:description',content:'متابعة طلبات واتساب وتلجرام.'},{property:'og:type',content:'website'},{name:'twitter:card',content:'summary_large_image'}]}),component:()=> <AdminApp view="requests"/>});
