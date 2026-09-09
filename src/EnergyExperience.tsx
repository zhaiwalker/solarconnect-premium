import { useId, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { BatteryCharging, Moon, Sun } from '@phosphor-icons/react';
import './energy-experience.css';

const moments = [
  {
    id: 'day',
    label: 'День',
    icon: Sun,
    title: 'Солнце питает ваш дом.',
    description: 'Панели превращают солнечный свет в электричество для ваших повседневных дел. Вы пользуетесь собственной энергией, пока её вырабатывает станция.',
    caption: 'Энергия начинается на крыше',
  },
  {
    id: 'evening',
    label: 'Вечер',
    icon: Moon,
    title: 'Солнце село. Энергия осталась.',
    description: 'С накопителем часть дневной энергии можно сохранить до вечера. Доступный запас зависит от ёмкости аккумулятора, его заряда и потребления дома.',
    caption: 'Сохранённая энергия — для вечера',
  },
  {
    id: 'backup',
    label: 'Резерв',
    icon: BatteryCharging,
    title: 'Продолжайте привычный день.',
    description: 'При отключении сети гибридный инвертор и заряженный аккумулятор поддерживают выбранные приборы. Состав и время работы резерва рассчитываем для вашего дома.',
    caption: 'Резерв для того, что важно',
  },
] as const;

export default function EnergyExperience() {
  const [selected, setSelected] = useState(0);
  const reducedMotion = useReducedMotion();
  const instanceId = useId();
  const selectedMoment = moments[selected];
  const Icon = selectedMoment.icon;

  return (
    <section className="energy-experience" id="energy" aria-labelledby={`${instanceId}-heading`}>
      <div className="energy-inner">
        <motion.header
          className="energy-heading"
          initial={reducedMotion ? false : { opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        >
          <p className="energy-eyebrow">Энергия в ритме вашей жизни</p>
          <h2 id={`${instanceId}-heading`}>Ваш день.<br /><span>На солнечной энергии.</span></h2>
          <p className="energy-intro">Посмотрите, как солнечная станция<br className="energy-wide-break" /> может работать в течение дня.</p>
        </motion.header>

        <div className="energy-stage" data-moment={selectedMoment.id}>
          <img
            className="energy-house"
            src="/images/house.webp"
            alt="Солнечные панели на крыше частного дома"
            width="1200"
            height="900"
            loading="lazy"
          />
          <motion.div
            className="energy-evening-light"
            aria-hidden="true"
            animate={{ opacity: selected === 1 ? 1 : 0 }}
            transition={{ duration: reducedMotion ? 0.15 : 0.8 }}
          />
          <motion.div
            className="energy-night-light"
            aria-hidden="true"
            animate={{ opacity: selected === 2 ? 1 : 0 }}
            transition={{ duration: reducedMotion ? 0.15 : 0.8 }}
          />
          <div className="energy-photo-shade" aria-hidden="true" />
          <div className="energy-scene-caption" aria-hidden="true">
            <Icon size={24} weight="light" />
            <span>{selectedMoment.caption}</span>
          </div>
          <div className="energy-controls" role="group" aria-label="Выберите время работы станции">
            {moments.map((moment, index) => {
              const MomentIcon = moment.icon;
              return (
                <button
                  className="energy-control"
                  type="button"
                  key={moment.id}
                  aria-pressed={selected === index}
                  aria-controls={`${instanceId}-description`}
                  onClick={() => setSelected(index)}
                >
                  {selected === index && (
                    <motion.span
                      className="energy-control-surface"
                      layoutId={`${instanceId}-selection`}
                      transition={reducedMotion
                        ? { duration: 0 }
                        : { type: 'spring', bounce: 0, duration: 0.4 }}
                    />
                  )}
                  <MomentIcon size={18} weight="regular" aria-hidden="true" />
                  <span>{moment.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="energy-copy" id={`${instanceId}-description`} aria-live="polite" aria-atomic="true">
          {moments.map((moment, index) => (
            <motion.div
              className="energy-copy-panel"
              key={moment.id}
              aria-hidden={selected !== index}
              inert={selected !== index}
              initial={false}
              animate={{ opacity: selected === index ? 1 : 0, y: reducedMotion ? 0 : selected === index ? 0 : 6 }}
              transition={{ duration: reducedMotion ? 0.15 : 0.35 }}
              style={{ pointerEvents: selected === index ? 'auto' : 'none' }}
            >
              <h3>{moment.title}</h3>
              <p>{moment.description}</p>
            </motion.div>
          ))}
        </div>
        <p className="energy-note">Иллюстрация принципа работы. Для вечернего питания и резерва необходима система с накопителем.</p>
      </div>
    </section>
  );
}
