'use client';
import { Coffee, Heart, Sparkles } from 'lucide-react';
import Modal from './Modal';

export default function DonateModal({ close }: { close: () => void }) {
  const accountHolder = 'NGUYEN HA PHONG';

  return (
    <Modal title="Mời cốc cà phê — Tiếp sức Server ☕" close={close}>
      <div className="donate-container" style={{ textAlign: 'center', padding: '0.5rem 0' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 56, height: 56, borderRadius: '50%', background: '#ffedd5', color: '#ea580c', marginBottom: '0.75rem' }}>
          <Coffee size={30} />
        </div>
        <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1e293b', margin: '0 0 0.5rem' }}>
          Bát phở thêm hành, Server thêm RAM 🍜
        </h3>
        <p style={{ fontSize: '0.925rem', color: '#475569', lineHeight: 1.6, margin: '0 0 1rem', textAlign: 'justify' }}>
          <strong>Hôm nay ăn gì?</strong> là dự án cộng đồng phi lợi nhuận, ra đời để giải cứu mọi người khỏi câu hỏi <em>&quot;Trưa nay ăn gì?&quot;</em>. Chúng mình cam kết không quảng cáo bẩn, không nhận tiền PR quán để giữ cho mọi trải nghiệm ẩm thực luôn chân thực nhất.
        </p>
        <p style={{ fontSize: '0.925rem', color: '#475569', lineHeight: 1.6, margin: '0 0 1.25rem', textAlign: 'justify' }}>
          Tuy nhiên, để máy chủ Azure chạy mượt mà 24/7 và database không bị &quot;đói&quot;, tụi mình vẫn chi trả chi phí hạ tầng mỗi tháng. Nếu trang web từng giúp bạn tìm được quán ruột hoặc cứu bạn một bữa đói, hãy mời tác giả một ly cà phê (hay bát phở nóng) tiếp lửa nhé!
        </p>

        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '1.25rem', margin: '0 auto 1.25rem', maxWidth: '340px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
          <div style={{ background: '#fff', borderRadius: '12px', padding: '8px', display: 'inline-block', border: '1px solid #cbd5e1' }}>
            <img
              src="/images/donate-qr.jpg"
              alt="Mã QR Chuyển khoản ủng hộ Hôm nay ăn gì"
              style={{ width: '220px', height: 'auto', display: 'block', borderRadius: '8px' }}
            />
          </div>
          <div style={{ marginTop: '0.75rem', fontWeight: 700, fontSize: '1.05rem', color: '#0f172a', letterSpacing: '0.5px' }}>
            {accountHolder}
          </div>
          <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '2px' }}>
            Quét mã nhận từ mọi ngân hàng &amp; ví điện tử (50+)
          </div>
        </div>

        <p style={{ fontSize: '0.875rem', color: '#ea580c', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', margin: '0' }}>
          <Heart size={16} fill="#ea580c" /> Cảm ơn bạn rất nhiều vì đã đồng hành cùng cộng đồng! <Sparkles size={16} />
        </p>
      </div>
    </Modal>
  );
}
