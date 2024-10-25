// idc if you skid but give fair credits to https://github.com/PerseusPotter/chicktils and https://github.com/brennenxyz/Fossil

class FossilMacro {
    constructor() {
        this.itemIdDict = Java.type('net.minecraft.item.Item').field_150901_e;
        this.lowerInvF = Java.type('net.minecraft.client.gui.inventory.GuiChest').class.getDeclaredField('field_147015_w'); 
        this.lowerInvF.setAccessible(true);
        this.currentThread = false;
        this.chiselIndex;
        this.scrapIndex;
        this.prefix = 'Conatus => '
        this.delay = 250;
        this.sigmaIndex = 0;
        this.enabled = false;
        this.restarting = false;
        this.key = new KeyBind("Fossil Macro",Keyboard.KEY_NONE,"Conatus")
        this.lastGuiOpened;
        this.fossils = [
          `00100
           01010
           10001
           10010
           10000.`,
          `0011100
           0101010
           1001001
           0001000`,
          `00011110
           00100001
           11000010
           11000000.`,
          `001100
           011110
           111111`,
          `000010
           001111
           010110
           101010
           010100.`,
          `00011
           01100
           11111
           01100
           00011`,
          `1111
           1001
           1101
           0001
           1111.`,
          `011110
           111111
           011110
           001100`
      ].map(s => {
          s = s.trim();
          const a = s[s.length - 1] === '.';
          if (a) s = s.slice(0, -1);
          const l = s.split('\n').map(v => v.trim().split('').map(v => v === '1' ? true : false));
          return {
            arr: l,
            w: l[0].length,
            h: l.length,
            size: l.reduce((a, v) => a + v.reduce((a, v) => a + v, 0), 0),
            a
          };
        });

        this.key.registerKeyPress(() => {
            this.enabled = !this.enabled;

            if(this.enabled) {
                ChatLib.chat(`${this.prefix}Enabled.`)
                this.startThread(this.threadStart);
            } else {
              this.startThread(new Thread(() => {}))
              ChatLib.chat(`${this.prefix}Disabled.`)
            }
        })

        this.chatRegister = register("chat", () => {
          if(!this.enabled) return;
          this.enabled = !this.enabled;
          ChatLib.chat(`${this.prefix}No more scrap :(`)
        }).setCriteria("You need to put both a chisel and a fossil in the machine!")

        this.guiTest = register('guiKey', (char, keycode, gui, event) => {
          if(!this.enabled) return;
          if(keycode !== this.key.getKeyCode()) return;
          this.enabled = !this.enabled

          if(this.enabled) {
            ChatLib.chat(`${this.prefix}Enabled.`)
            this.startThread(this.threadStart);
          } else {
            this.startThread(new Thread(() => {}))
            ChatLib.chat(`${this.prefix}Disabled.`)
          }
        }).unregister();

        register("guiOpened", (event) => {
          if(!this.enabled) return;
          this.guiTest.register()
          this.lastGuiOpened = event.gui
        })

        register("guiClosed", () => {
          if(!this.enabled) return;
          this.guiTest.unregister()
        })

    }

    getItemId(item) {
      return this.itemIdDict.func_177774_c(item.func_77973_b()).toString();
    }

    getLowerContainer(gui) {
      return this.lowerInvF.get(gui);
    }

    getCharges(lastGuiOpened) {
        const inv = getLowerContainer(lastGuiOpened);
        let dust = new Array(54).fill(false);
        let dirt = new Array(54).fill(false);
        let trea = new Array(54).fill(false);
        let dc = 0;
        let charges = 0;
        
        for (let i = 0; i < 54; i++) {
            let item = inv.func_70301_a(i);
            if (item === null) continue;
            if (getItemId(item) !== 'minecraft:stained_glass_pane') continue;
            let dmg = item.func_77960_j();
            dust[i] = dmg === 0;
            dirt[i] = dmg !== 0/* && dmg !== 5*/;
            trea[i] = dmg === 5;
            if (dust[i]) {
                d = item;
                dc++;
            } else if (dirt[i] && charges === -1) {
                const tag = item.func_77978_p().func_74775_l('display');
                const lore = tag.func_150295_c('Lore', 8);
                for (let i = 0; i < lore.func_74745_c(); i++) {
                    let m = lore.func_150307_f(i).match(/^§7Chisel Charges Remaining: §.(\d+)$/);
                    if (m) {
                        charges = +m[1];
                        break;
                    }
                }
            }
        }

        return charges;
    }

    lClick() {
        if(!this.enabled) return;
        const leftClickMethod = Client.getMinecraft().getClass().getDeclaredMethod("func_147116_af", null)
        leftClickMethod.setAccessible(true);
        leftClickMethod.invoke(Client.getMinecraft(), null) 
    }

    startThread(thread) {
      this.restarting = false;
      new Thread(() => {
        if(!this.enabled) return;
        if(!this.currentThread) {
          this.chiselIndex = false;
          this.scrapIndex = false;
          this.sigmaIndex = 0;
          Thread.sleep(250)
          thread.start();
          this.currentThread = thread
        } else {
          this.sigmaIndex = 0;
          this.chiselIndex = false;
          this.scrapIndex = false;
          this.currentThread.stop(); // just a failsafe
          Thread.sleep(250)
          thread.start();
          this.currentThread = thread
        }
      }).start()
    } 

    click(slot, shift = false, type = "LEFT") {
      if(!this.enabled) return;
      if(!Client.isInGui()) return;
      if(Player.getContainer() !== null && Player.getContainer().getStackInSlot(slot) !== null) Player.getContainer().click(slot, shift, type);
    }

    getNextSlotToClick(gui) {
        if(!this.enabled) return;
        if(gui.getClass().getSimpleName() !== 'GuiChest') return false;
        const inv = getLowerContainer(gui);
      
        let poss = [];
        let size = 0;
        let dust = new Array(54).fill(false);
        let dirt = new Array(54).fill(false);
        let trea = new Array(54).fill(false);
        let dc = 0;
        let charges = 0;
        let hist = new Array(54).fill(0);
      
        const test = (l, i) => {
          const f = this.fossils[l.f];
          let y = ~~(i / 9) - ~~(l.p / 9);
          let x = (i % 9) - (l.p % 9);
          if (x < 0 || y < 0) return false;
          if (l.r & 1) {
            const t = y;
            y = x;
            x = t;
          }
          if (x >= f.w || y >= f.h) return false;
          if (l.m ^ (l.r === 1 || l.r === 2)) x = f.w - x - 1;
          if (l.r === 2 || l.r === 3) y = f.h - y - 1;
          return f.arr[y][x];
        };
      
        for (let i = 0; i < 54; i++) {
          let item = inv.func_70301_a(i);
          if (item === null) continue;
          if (getItemId(item) !== 'minecraft:stained_glass_pane') continue;
          let dmg = item.func_77960_j();
          dust[i] = dmg === 0;
          dirt[i] = dmg !== 0;
          trea[i] = dmg === 5;
          if (dust[i]) {
            dc++;
          } else if (dirt[i] && charges === -1) {
            const tag = item.func_77978_p().func_74775_l('display');
            const lore = tag.func_150295_c('Lore', 8);
            for (let j = 0; j < lore.func_74745_c(); j++) {
              let m = lore.func_150307_f(j).match(/^§7Chisel Charges Remaining: §.(\d+)$/);
              if (m) {
                charges = +m[1];
                break;
              }
            }
          }
        }
      
        if (dc > 0 && size === 0) {
          const tag = inv.func_70301_a(dust.indexOf(true)).func_77978_p().func_74775_l('display');
          const lore = tag.func_150295_c('Lore', 8);
          for (let i = 0; i < lore.func_74745_c(); i++) {
            let m = lore.func_150307_f(i).match(/^§7Fossil Excavation Progress: §.([\d.]+)%$/);
            if (m) {
              size = Math.round(100 / (+m[1]) * dc);
              break;
            }
          }
        }
      
        this.fossils.forEach((v, i) => {
          if (size > 0 && v.size !== size) return;
          for (let y = 0; y <= 6 - v.h; y++) {
            for (let x = 0; x <= 9 - v.w; x++) {
              poss.push({ f: i, p: (y * 9) + x, r: 0, m: false });
              poss.push({ f: i, p: (y * 9) + x, r: 2, m: false });
              if (v.a) {
                poss.push({ f: i, p: (y * 9) + x, r: 0, m: true });
                poss.push({ f: i, p: (y * 9) + x, r: 2, m: true });
              }
            }
          }
          for (let y = 0; y <= 6 - v.w; y++) {
            for (let x = 0; x <= 9 - v.h; x++) {
              poss.push({ f: i, p: (y * 9) + x, r: 1, m: false });
              poss.push({ f: i, p: (y * 9) + x, r: 3, m: false });
              if (v.a) {
                poss.push({ f: i, p: (y * 9) + x, r: 1, m: true });
                poss.push({ f: i, p: (y * 9) + x, r: 3, m: true });
              }
            }
          }
        });
      
        poss = poss.filter(v => {
          if (size > 0 && this.fossils[v.f].size !== size) return false;
          for (let i = 0; i < 54; i++) {
            if ((!dirt[i]) && (test(v, i) ^ dust[i])) return false;
          }
          return true;
        });
    
        if (poss.length === 0) { return false; }
      
        hist = new Array(54).fill(0);
        poss.forEach(v => {
          for (let i = 0; i < 54; i++) {
            if (!dirt[i]) continue;
            if (test(v, i)) hist[i]++;
          }
        });
      
        let best = hist.reduce((a, v, i) => hist[a] > v ? a : i, 0);
      
        return best;
    }

    threadStart = new Thread(() => {
        if(!this.enabled) return;
        this.lClick();
        Thread.sleep(this.delay);
        for (let i = Player.getContainer().getItems().length - 1; i > Player.getContainer().getItems().length - Player.getInventory().getItems().length; i--) {
            let item = Player?.getContainer()?.getStackInSlot(i);
            if(item == null) continue;
            if (item?.getName()?.toLowerCase()?.includes(`suspicious scrap`)) this.scrapIndex = i;
            if (item?.getName()?.toLowerCase()?.includes(` chisel`) && !item?.getName()?.toLowerCase()?.includes(`gemstone`)) this.chiselIndex = i;
        }
        if(!this.chiselIndex || this.chiselIndex == -1 || !this.scrapIndex || this.scrapIndex == -1) {
          ChatLib.chat(`${this.prefix}Scrap or Chisel Missing.`);
          this.enabled = !this.enabled
          return;
        } else {
          Thread.sleep(this.delay)
          this.click(this.scrapIndex, true, `LEFT`)
          Thread.sleep(this.delay)
          this.click(this.chiselIndex, true, `LEFT`)
          Thread.sleep(this.delay)
          this.click(31, false, `LEFT`)
          Thread.sleep(this.delay)
          this.startThread(this.threadExcavate)
        }

    })
    
    slots = [
        22,
        41,
        30,
        23,
        12,
        34,
        19,
        39
    ];

    threadExcavate = new Thread(() => {
      if(!this.enabled) return;
      let slotsClicked = [];
  
      this.slots.forEach((slot, index) => {
          Thread.sleep(this.delay)
          this.click(slot);
          Thread.sleep(this.delay)

          slotsClicked.push(slot)
          slotsClicked.forEach(slot => {
            let it = Player?.getContainer()?.getStackInSlot(slot)?.getName()?.toLowerCase();

              if (
                  it == "	§6Fossil"
              ) {
                  this.startThread(this.threadFound)
                  return; 
              }
      
              if (index === this.slots.length - 1) {
                this.startThread(this.threadNot)
              }
          })
      });
  });
    
  threadNot = new Thread(() => {
      if(!this.enabled) return;
        let slots = []
        Player.getContainer().getItems().forEach((item, index) => {
            if(!item) return;
            let fs = ``
            item?.getLore()?.forEach(s => fs += s)
            if(fs?.includes(`highlighted`)) {
                return slots.push(index)
            }
        })
        Player.getContainer().getItems().forEach((item, index) => {
            if(!item) return;
            if(slots.includes(index)) return;
            if(item?.getName()?.toLowerCase()?.includes(`dirt`) && slots.length !== 15) {
                slots.push(index)
            } else return;
        })
        slots.forEach(index => {
            Thread.sleep(this.delay)
            this.click(index);
            Thread.sleep(this.delay);
        })
        
        if(this.getCharges(this.lastGuiOpened) == 0) {
            if(this.restarting) return;
            ChatLib.chat(`${this.prefix}Restarting...`)
            this.restarting = true;
            Client.currentGui.close();
            Thread.sleep(this.delay);
            this.startThread(new Thread(() => {}));
            Thread.sleep(250)
            this.enabled = !this.enabled;
            Thread.sleep(5)
            this.enabled = !this.enabled;
            this.startThread(this.threadStart)
        }
    })

    threadFound = new Thread(() => {
        if(!this.enabled) return;
        if(!Client.currentGui) return this.lastGuiOpened = false;
        let slot = this.getNextSlotToClick(this.lastGuiOpened)
        Thread.sleep(150) // allocate extra time
        if(slot == -1 || !slot) {
            let retrySlot = this.getNextSlotToClick(this.lastGuiOpened)
            Thread.sleep(150) // allocate extra time
            if(retrySlot == -1 || !retrySlot) {
                this.startThread(new Thread((() => {})));
                ChatLib.chat(`${this.prefix}Slot Bug. Restarting...`);
                if(this.restarting) return;
                ChatLib.chat(`${this.prefix}Restarting...`)
                this.restarting = true;
                Client.currentGui.close();
                Thread.sleep(this.delay);
                this.startThread(new Thread(() => {}));
                Thread.sleep(250)
                this.enabled = !this.enabled;
                Thread.sleep(5)
                this.enabled = !this.enabled;
                this.startThread(this.threadStart)
            } else slot = retrySlot;
        }
        
        this.click(slot)
        Client.scheduleTask((this.delay/50), () => {
            if(this.getCharges(this.lastGuiOpened) !== 0) return this.startThread(this.threadFound);
        })
    })
}

new FossilMacro()
