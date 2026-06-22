import { useState, useEffect, useCallback } from 'react';
import { adsAPI } from '../api/ads';
import { adminAPI } from '../api/admin';
import toast from '../utils/toast';

const DEMO_PRODUCT = {
  name: 'Premium Black Cotton T-Shirt',
  description: 'Made from 220 GSM premium cotton. Oversized fit, reinforced stitching, pre-shrunk fabric. Features a bold graphic print on the front with a minimalist back logo. Available in sizes S-5XL. Machine washable, fade-resistant colors.',
  category: { name: 'T-Shirts' },
  price: 799,
  images: [{ url: 'https://images.unsplash.com/photo-1576566588028-4147f3842f27?q=80&w=200' }],
  slug: 'premium-black-cotton-t-shirt',
};

export default function useAdAI() {
  const [aiPlatform, setAiPlatform] = useState('FACEBOOK');
  const [aiTone, setAiTone] = useState('professional');
  const [aiBrandVoice, setAiBrandVoice] = useState('threvolt');
  const [aiGeneratedCopy, setAiGeneratedCopy] = useState(null);
  const [aiResultTab, setAiResultTab] = useState('copy');
  const [aiLoading, setAiLoading] = useState(false);

  // AI Sub-features
  const [aiVariants, setAiVariants] = useState([]);
  const [aiVariantsLoading, setAiVariantsLoading] = useState(false);
  const [aiStrategy, setAiStrategy] = useState(null);
  const [aiStrategyLoading, setAiStrategyLoading] = useState(false);
  const [aiAudience, setAiAudience] = useState(null);
  const [aiAudienceLoading, setAiAudienceLoading] = useState(false);

  // Product selection
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [products, setProducts] = useState([]);
  const [productSearch, setProductSearch] = useState('');

  // Demo loading states
  const [waDemoLoading, setWaDemoLoading] = useState(false);
  const [gdDemoLoading, setGdDemoLoading] = useState(false);

  // Search products for AI tools
  useEffect(() => {
    if (!productSearch) return;
    const timer = setTimeout(async () => {
      try {
        const r = await adminAPI.getProducts({ search: productSearch, page: 1, limit: 20 });
        setProducts(r.data?.data || []);
      } catch { setProducts([]); }
    }, 300);
    return () => clearTimeout(timer);
  }, [productSearch]);

  const generateAdCopy = useCallback(async (useDemo = false) => {
    setAiLoading(true);
    try {
      const isDemo = useDemo;
      const payload = {
        platform: isDemo ? 'INSTAGRAM' : aiPlatform,
        tone: isDemo ? 'professional' : aiTone,
        brandVoice: aiBrandVoice,
        productName: isDemo ? DEMO_PRODUCT.name : (selectedProduct?.name || undefined),
        productDescription: isDemo ? DEMO_PRODUCT.description : (selectedProduct?.description || undefined),
        productId: isDemo ? undefined : (selectedProduct?.id || undefined),
      };
      const r = await adsAPI.aiGenerateAdCopy(payload);
      setAiGeneratedCopy({ ...(r.data?.data || r.data), _demo: isDemo });
      setAiResultTab('copy');
    } catch (err) {
      toast.error(err?.response?.data?.message || 'AI generation failed. Check OPENAI_API_KEY.');
    }
    setAiLoading(false);
  }, [aiPlatform, aiTone, aiBrandVoice, selectedProduct]);

  const generateDemoAdCopy = useCallback(() => {
    setAiGeneratedCopy(null);
    generateAdCopy(true);
  }, [generateAdCopy]);

  const generateDemoWhatsApp = useCallback(async () => {
    setWaDemoLoading(true);
    setAiGeneratedCopy(null);
    setAiResultTab('copy');
    try {
      const r = await adsAPI.aiGenerateAdCopy({
        platform: 'WHATSAPP', tone: 'friendly', brandVoice: aiBrandVoice,
        productName: DEMO_PRODUCT.name, productDescription: DEMO_PRODUCT.description,
      });
      setAiGeneratedCopy({ ...(r.data?.data || r.data), _demo: true, _platform: 'WHATSAPP' });
      toast.success('WhatsApp broadcast sample generated!');
    } catch (err) {
      toast.error(err?.response?.data?.message || 'AI generation failed. Check OPENAI_API_KEY.');
    }
    setWaDemoLoading(false);
  }, [aiBrandVoice]);

  const generateDemoGoogle = useCallback(async () => {
    setGdDemoLoading(true);
    setAiGeneratedCopy(null);
    setAiResultTab('copy');
    try {
      const r = await adsAPI.aiGenerateAdCopy({
        platform: 'GOOGLE', tone: 'professional', brandVoice: aiBrandVoice,
        productName: DEMO_PRODUCT.name, productDescription: DEMO_PRODUCT.description,
      });
      setAiGeneratedCopy({ ...(r.data?.data || r.data), _demo: true, _platform: 'GOOGLE' });
      toast.success('Google Search ad sample generated!');
    } catch (err) {
      toast.error(err?.response?.data?.message || 'AI generation failed.');
    }
    setGdDemoLoading(false);
  }, [aiBrandVoice]);

  const generateVariants = useCallback(async () => {
    setAiVariantsLoading(true);
    try {
      const r = await adsAPI.aiGenerateVariants({
        platform: aiPlatform, tone: aiTone, brandVoice: aiBrandVoice,
        productName: selectedProduct?.name, productDescription: selectedProduct?.description, maxVariants: 4,
      });
      const data = r.data?.data || r.data;
      setAiVariants(data?.variants || []);
      setAiResultTab('variants');
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to generate variants');
    }
    setAiVariantsLoading(false);
  }, [aiPlatform, aiTone, aiBrandVoice, selectedProduct]);

  const generateStrategy = useCallback(async () => {
    setAiStrategyLoading(true);
    try {
      const r = await adsAPI.aiGenerateStrategy({
        platform: aiPlatform, tone: aiTone, brandVoice: aiBrandVoice,
        productName: selectedProduct?.name, productDescription: selectedProduct?.description,
        productCategory: selectedProduct?.category?.name,
        productPrice: selectedProduct?.price ? Number(selectedProduct.price) : undefined,
      });
      setAiStrategy(r.data?.data || r.data);
      setAiResultTab('strategy');
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to generate strategy');
    }
    setAiStrategyLoading(false);
  }, [aiPlatform, aiTone, aiBrandVoice, selectedProduct]);

  const suggestAudience = useCallback(async () => {
    setAiAudienceLoading(true);
    try {
      const r = await adsAPI.aiSuggestAudience({
        productName: selectedProduct?.name, productDescription: selectedProduct?.description,
        platform: aiPlatform, brandVoice: aiBrandVoice,
      });
      setAiAudience(r.data?.data || r.data);
      setAiResultTab('audience');
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to suggest audience');
    }
    setAiAudienceLoading(false);
  }, [aiPlatform, aiBrandVoice, selectedProduct]);

  const resetAI = () => {
    setAiGeneratedCopy(null);
    setAiVariants([]);
    setAiStrategy(null);
    setAiAudience(null);
    setAiResultTab('copy');
  };

  return {
    aiPlatform, setAiPlatform, aiTone, setAiTone,
    aiBrandVoice, setAiBrandVoice,
    aiGeneratedCopy, aiLoading, aiResultTab, setAiResultTab,
    aiVariants, aiVariantsLoading,
    aiStrategy, aiStrategyLoading,
    aiAudience, aiAudienceLoading,
    selectedProduct, setSelectedProduct,
    products, productSearch, setProductSearch,
    waDemoLoading, gdDemoLoading,
    DEMO_PRODUCT,

    generateAdCopy, generateDemoAdCopy,
    generateDemoWhatsApp, generateDemoGoogle,
    generateVariants, generateStrategy,
    suggestAudience,
    resetAI,
  };
}
