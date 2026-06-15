import { SignedIn, SignedOut, UserButton, useUser } from "@clerk/clerk-react";
import { Link, useNavigate } from "react-router";
import { useCartContext } from "../cartContext";
import { UsernameModal } from "./UsernameModal";
import { GiftsReceived } from "./GiftsReceived";
import { GiftsSentReflections } from "./GiftsSentReflections";
import { useState } from "react";

export const Header = () => {
  const { itemCount: cartItemCount } = useCartContext();
  const { user } = useUser();
  const navigate = useNavigate();
  const isAdmin = (user?.publicMetadata as any)?.role === "admin";
  const [isUsernameModalOpen, setIsUsernameModalOpen] = useState(false);

  return (
    <div className="text-[#d5f7ff] bg-[#071e25] font-sans px-4 flex justify-between h-15 fixed top-0 left-0 right-0 z-40 border-b border-[#0e3942]/80 shadow-md shadow-black/40">
      <div className="font-extrabold flex items-center tracking-wide text-base">
        <Link
          to="/"
          className="text-teal-500 hover:text-pink-400 transition-colors duration-200"
        >
          TopoJoy
        </Link>
      </div>
      <div className="flex-grow flex justify-end">
        <div style={{ height: "42px" }}></div>
        <div className="flex items-center bg-pink" style={{ fontSize: "10px" }}>
          <div className="pr-3"></div>
          <div className="flex items-center ml-auto">
            <a
              className={
                "text-white text-xs font-bold py-1 px-4 rounded transition-all duration-200"
              }
              href="/geojson.io/index.html"
            >
              Map Editor
            </a>
          </div>
          <div className="pr-3"></div>
          <div className="flex items-center ml-auto">
            <Link to="/donate">
              <span className="text-teal-400 text-xs font-bold py-1 px-4 rounded transition-all duration-200">
                Donate
              </span>
            </Link>
          </div>
          <div className="flex items-center ml-auto">
            <Link to="/app">
              <span className="text-white text-xs font-bold py-1 px-4 rounded transition-all duration-200">
                App
              </span>
            </Link>
          </div>

          <div>
            <SignedIn>
              <div className="flex items-center ml-auto">
                <Link to="/cart">
                  <span className="relative inline-flex items-center gap-1 text-white text-xs font-bold py-1 px-4 rounded transition-all duration-200">
                    <span>Cart</span>
                    {cartItemCount > 0 && (
                      <span className="inline-flex items-center justify-center min-w-[16px] h-4 rounded-full bg-red-500 text-[10px] px-1">
                        {cartItemCount}
                      </span>
                    )}
                  </span>
                </Link>
                <UserButton afterSignOutUrl="/sign-in">
                  <UserButton.MenuItems>
                    <UserButton.Action
                      label="Set Username"
                      labelIcon={<span>👤</span>}
                      onClick={() => setIsUsernameModalOpen(true)}
                    />
                    <UserButton.Action
                      label="My Maps"
                      labelIcon={<span>🗺️</span>}
                      onClick={() => navigate("/my-maps")}
                    />
                    <UserButton.Action
                      label="Gifts Sent"
                      labelIcon={<span>📦</span>}
                      onClick={() => navigate("/my-orders")}
                    />
                    {isAdmin && (
                      <UserButton.Action
                        label="Admin"
                        labelIcon={<span>⚙️</span>}
                        onClick={() => navigate("/admin")}
                      />
                    )}
                  </UserButton.MenuItems>

                  {/* Custom pages in the account modal */}
                  <UserButton.UserProfilePage
                    label="My Maps"
                    labelIcon={<span>🗺️</span>}
                    url="my-maps"
                  >
                    <div className="p-6">
                      <h2 className="text-xl font-bold mb-4">My Maps</h2>
                      <p className="text-sm text-gray-600 mb-4">
                        View and manage your saved maps
                      </p>
                      <button
                        onClick={() => navigate("/my-maps")}
                        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                      >
                        Go to My Maps
                      </button>
                    </div>
                  </UserButton.UserProfilePage>

                  <UserButton.UserProfilePage
                    label="Gifts Sent"
                    labelIcon={<span>📦</span>}
                    url="gifts-sent"
                  >
                    <div className="p-6 space-y-4">
                      <div>
                        <h2 className="text-xl font-bold mb-1">Gifts Sent</h2>
                        <p className="text-sm text-gray-500">
                          Leave a note for someone whose gift has been redeemed.
                        </p>
                      </div>
                      <GiftsSentReflections />
                      <button
                        onClick={() => navigate("/my-orders")}
                        className="text-xs text-blue-600 hover:underline"
                      >
                        View full order history →
                      </button>
                    </div>
                  </UserButton.UserProfilePage>

                  <UserButton.UserProfilePage
                    label="Gifts Received"
                    labelIcon={<span>🎁</span>}
                    url="gifts-received"
                  >
                    <div className="p-6">
                      <GiftsReceived />
                    </div>
                  </UserButton.UserProfilePage>

                  <UserButton.UserProfilePage
                    label="Username"
                    labelIcon={<span>👤</span>}
                    url="username"
                  >
                    <div className="p-6">
                      <h2 className="text-xl font-bold mb-4">Set Username</h2>
                      <p className="text-sm text-gray-600 mb-4">
                        Your username:{" "}
                        <strong>{user?.username || "Not set"}</strong>
                      </p>
                      <button
                        onClick={() => setIsUsernameModalOpen(true)}
                        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                      >
                        Change Username
                      </button>
                    </div>
                  </UserButton.UserProfilePage>
                </UserButton>
              </div>
            </SignedIn>
            <SignedOut>
              <Link
                to="/sign-in"
                className="text-white text-xs font-bold py-1 px-4 rounded transition-all duration-200"
              >
                Sign In
              </Link>
            </SignedOut>
          </div>
        </div>
      </div>

      <UsernameModal
        isOpen={isUsernameModalOpen}
        onClose={() => setIsUsernameModalOpen(false)}
      />
    </div>
  );
};
