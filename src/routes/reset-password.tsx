import { createFileRoute, Link } from '@tanstack/react-router';
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
export const Route=createFileRoute('/reset-password')({head:()=>({meta:[{title:'إعادة تعيين كلمة المرور | عرش الهندسة'},{name:'description',content:'استعادة الوصول الآمن إلى الإدارة.'},{property:'og:title',content:'استعادة الوصول | عرش الهندسة'},{property:'og:description',content:'إعادة تعيين كلمة المرور.'},{property:'og:type',content:'website'},{name:'twitter:card',content:'summary_large_image'}]}),component:Reset});
function Reset(){const [password,setPassword]=useState('');return <main dir="rtl" className="access-area min-h-screen"><form className="auth-panel" onSubmit={async e=>{e.preventDefault();const {error}=await supabase.auth.updateUser({password});if(error)toast.error(error.message);else toast.success('تم تحديث كلمة المرور');}}><h1>كلمة مرور جديدة</h1><Input aria-label="كلمة المرور الجديدة" type="password" minLength={8} required value={password} onChange={e=>setPassword(e.target.value)}/><Button type="submit" className="w-full mt-4">حفظ كلمة المرور</Button><Button asChild variant="link"><Link to="/">العودة للإدارة</Link></Button></form></main>}
