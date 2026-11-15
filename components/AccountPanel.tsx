'use client';
import {useState, useEffect} from 'react';
import {Camera, Plus, Pencil, Check, X, LogOut, Mail, ShieldCheck, Sparkles, LoaderCircle, UtensilsCrossed, Store} from 'lucide-react';
import {api, date, money} from '../lib/client';

export default function AccountPanel({user, mine, Edit, Select, S, notify, changeTab, load, post, openPlace, authProvider}: any) {
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<any>(user || null);

  useEffect(() => {
    if (user) {
      setProfile((prev: any) => ({ ...prev, ...user }));
      setNameInput(user.name || '');
    }
    api('profile')
      .then((res: any) => {
        if (res?.user) {
          setProfile(res.user);
          setNameInput(res.user.name || '');
        }
      })
      .catch(() => {});
  }, [user]);

  const saveProfile = async () => {
    const trimmed = nameInput.trim();
    if (trimmed.length < 2) {
      notify('Tên hiển thị phải có ít nhất 2 ký tự.');
      return;
    }
    if (trimmed.length > 50) {
      notify('Tên hiển thị tối đa 50 ký tự.');
      return;
    }
    setSaving(true);
    try {
      const res = await api('profile', 'PATCH', { name: trimmed });
      notify(res.message || 'Đã cập nhật tên hiển thị!');
      setProfile((prev: any) => ({ ...prev, name: trimmed }));
      setEditingName(false);
      await load();
    } catch (err: any) {
      notify(err.message || 'Chưa cập nhật được tên. Vui lòng thử lại.');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    try {
      if (authProvider === 'firebase') {
        const { logoutGoogle } = await import('../lib/firebase-client');
        await logoutGoogle();
      }
      notify('Đã đăng xuất.');
      changeTab('discover');
      load();
    } catch {
      notify('Chưa đăng xuất được. Hãy thử lại.');
    }
  };

  const currentName = profile?.name || user?.name || 'Thành viên';
  const currentEmail = profile?.email || user?.email || '';
  const initial = currentName.charAt(0).toUpperCase();
  const isAdmin = !!(profile?.admin ?? user?.admin);
  const roleName = profile?.role ?? user?.role;
  const roleBadge = isAdmin
    ? (roleName === 'superadmin' ? 'SuperAdmin Quản trị viên' : 'Quản trị viên')
    : 'Thành viên ẩm thực';

  const placeCount = (mine || []).filter((r: any) => r.kind === 'place').length;
  const dishCount = (mine || []).filter((r: any) => r.kind !== 'place').length;
  const totalCount = (mine || []).length;

  return (
    <div className="account-panel-container">
      {/* Thẻ Hồ Sơ Người Dùng (User Profile Card) */}
      <section className="user-profile-card">
        <div className="profile-header-main">
          <div className="profile-avatar-wrap">
            <div className="profile-avatar-circle" aria-label={`Avatar ${currentName}`}>
              {initial}
            </div>
            <span className="profile-online-indicator" title="Tài khoản đang đăng nhập" />
          </div>

          <div className="profile-info-block">
            <div className="profile-name-edit-row">
              {!editingName ? (
                <>
                  <h2 className="profile-display-name">{currentName}</h2>
                  <button
                    type="button"
                    className="profile-edit-trigger"
                    onClick={() => {
                      setNameInput(currentName);
                      setEditingName(true);
                    }}
                    title="Đổi tên hiển thị trên hệ thống"
                  >
                    <Pencil size={13} />
                    <span>Đổi tên</span>
                  </button>
                </>
              ) : (
                <div className="profile-name-form">
                  <input
                    type="text"
                    className="profile-name-input"
                    value={nameInput}
                    maxLength={50}
                    placeholder="Nhập tên hiển thị mới..."
                    onChange={(e) => setNameInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') saveProfile();
                      if (e.key === 'Escape') setEditingName(false);
                    }}
                    autoFocus
                    disabled={saving}
                  />
                  <button
                    type="button"
                    className="button primary profile-save-btn"
                    onClick={saveProfile}
                    disabled={saving}
                  >
                    {saving ? <LoaderCircle size={13} className="spin" /> : <Check size={13} />}
                    <span>Lưu</span>
                  </button>
                  <button
                    type="button"
                    className="button secondary profile-cancel-btn"
                    onClick={() => setEditingName(false)}
                    disabled={saving}
                  >
                    <X size={13} />
                    <span>Hủy</span>
                  </button>
                </div>
              )}
            </div>

            <div className="profile-meta-pills">
              {currentEmail && (
                <span className="profile-meta-pill email-pill" title={currentEmail}>
                  <Mail size={12} />
                  <span>{currentEmail}</span>
                </span>
              )}
              <span className={`profile-meta-pill role-pill ${isAdmin ? 'admin-pill' : ''}`}>
                {isAdmin ? <ShieldCheck size={12} /> : <Sparkles size={12} />}
                <span>{roleBadge}</span>
              </span>
            </div>
          </div>

          <div className="profile-actions-block">
            {authProvider === 'firebase' ? (
              <button
                type="button"
                className="button secondary logout-profile-btn"
                onClick={handleLogout}
                title="Đăng xuất khỏi thiết bị này"
              >
                <LogOut size={14} />
                <span>Đăng xuất</span>
              </button>
            ) : (
              <a
                href="/signout-with-chatgpt?return_to=/"
                target="_top"
                className="button secondary logout-profile-btn"
              >
                <LogOut size={14} />
                <span>Đăng xuất</span>
              </a>
            )}
          </div>
        </div>

        {/* Thống kê hoạt động của cá nhân */}
        <div className="profile-stats-grid">
          <div className="stat-card">
            <span className="stat-number">{totalCount}</span>
            <span className="stat-title">Tổng đóng góp</span>
          </div>
          <div className="stat-card">
            <div className="stat-card-title-wrap">
              <UtensilsCrossed size={14} className="stat-icon" />
              <span className="stat-title">Món đã chia sẻ</span>
            </div>
            <span className="stat-number">{dishCount}</span>
          </div>
          <div className="stat-card">
            <div className="stat-card-title-wrap">
              <Store size={14} className="stat-icon" />
              <span className="stat-title">Quán đã đánh giá</span>
            </div>
            <span className="stat-number">{placeCount}</span>
          </div>
        </div>
      </section>

      {/* Danh sách trải nghiệm cá nhân (Cuốn sổ ăn uống) */}
      <section className="my-reviews-section">
        <div className="my-heading">
          <div>
            <h3 className="my-reviews-title">Cuốn sổ ăn uống của bạn</h3>
            <p className="muted">
              Bạn có thể cập nhật giá và cảm nhận khi quay lại quán. Bản cập nhật sẽ được duyệt lại.
            </p>
          </div>
          <button type="button" className="button primary my-post-btn" onClick={() => post()}>
            <Plus size={15} />
            <span>Thêm trải nghiệm</span>
          </button>
        </div>

        {mine && mine.length > 0 ? (
          <div className="my-reviews-list">
            {mine.map((r: any) => (
              <article className="my-review" key={r.id}>
                <div>
                  <span className={'status ' + r.status}>
                    {({ pending: 'Chờ duyệt', approved: 'Công khai', hidden: 'Đã ẩn', deleted: 'Đã xóa' } as any)[r.status]}
                  </span>
                  <h3>{r.kind === 'place' ? 'Đánh giá quán' : r.dish} · {r.restaurant_name}</h3>
                  <p>{r.content || r.taste}</p>
                  <small>{date(r.date)} · {r.kind !== 'place' ? money(r.total) + ' tổng · ' : ''}{r.rating}/5</small>
                  {r.reason && <p className="error">Lý do: {r.reason}</p>}
                </div>
                {(r.status !== 'deleted' || r.kind === 'place') && (
                  <div className="actions">
                    <button
                      type="button"
                      className="button secondary"
                      onClick={() => {
                        if (r.kind === 'place') openPlace(r.restaurant);
                        else {
                          Edit(r);
                          Select(null);
                          S('post');
                        }
                      }}
                    >
                      Cập nhật
                    </button>
                    <button
                      type="button"
                      className="text-button"
                      onClick={async () => {
                        if (confirm('Xóa trải nghiệm này khỏi phần công khai?')) {
                          try {
                            await api(r.kind === 'place' ? 'place-reviews' : 'reviews', 'DELETE', { id: r.id });
                            notify('Đã xóa bài.');
                            changeTab('mine');
                            load();
                          } catch (e: any) {
                            notify(e.message);
                          }
                        }
                      }}
                    >
                      Xóa
                    </button>
                  </div>
                )}
              </article>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <Camera size={34} />
            <h3>Cuốn sổ này đang chờ lần ăn đầu tiên.</h3>
            <p>Ghi lại món vừa ăn, giá đã trả và một tấm ảnh thật.</p>
            <button type="button" className="button primary" onClick={() => post()}>
              <Plus size={16} /> Viết trải nghiệm đầu tiên
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
